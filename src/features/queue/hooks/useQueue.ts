import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Q } from '@nozbe/watermelondb';
import { database } from '@db/database';
import { observeQuery } from '@db/observeQuery';
import { latestAnalysisResultsBySpecimen } from '@db/latestAnalysisResultsBySpecimen';
import Specimen from '@db/models/Specimen';
import AnalysisResult from '@db/models/AnalysisResult';
import { synchronize, LAST_SYNC_KEY } from '@db/sync/syncManager';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import type { QueueItem, FilterOption, PriorityLevel, SpecimenStatus } from '../types';

// The Queue's own actionable statuses (SRS UC 2.2 + product decision). A
// sample returned for correction (UC 3.4) is included separately below since
// that's a property of its analysis_results row, not the specimen's status.
const QUEUE_STATUSES: SpecimenStatus[] = ['ASSIGNED', 'PROCESSING'];
const RETURNED_RESULT_STATUS = 'RETURNED_FOR_CORRECTION';
// Backend only ever advances specimen.status to COMPLETED once a Supervisor
// approves/releases — it stays ASSIGNED for the entire window from MedTech
// confirmation through Supervisor review. Without this, a specimen the
// MedTech already confirmed (nothing left for them to do) keeps showing in
// their Queue until a Supervisor finally acts on it.
const FINISHED_RESULT_STATUSES = ['PENDING_SUPERVISOR_APPROVAL', 'APPROVED', 'RELEASED'];
const NO_RETURNED_SENTINEL = ['__none__'];

function specimenToQueueItem(s: Specimen, returnedServerIds: Set<string>): QueueItem {
  return {
    id: s.id,
    serverId: s.serverId,
    sampleUid: s.sampleUid,
    patientName: s.patientName,
    patientUid: s.patientUid,
    testType: s.testType,
    status: s.status as SpecimenStatus,
    priorityLevel: s.priorityLevel as PriorityLevel | null,
    receivedAt: s.receivedAt,
    medtechId: s.medtechId,
    rejectionReason: s.rejectionReason,
    rejectionNote: s.rejectionNote,
    rejectedAt: s.rejectedAt,
    syncedAt: s.syncedAt,
    isReturnedForCorrection: !!s.serverId && returnedServerIds.has(s.serverId),
  };
}

// Display-layer safety net: a past sync bug could leave two local specimen
// rows for the same server record sitting in storage (see
// db/sync/dedupeByServerId.ts, which now cleans this up on every sync). This
// collapses any that are still there RIGHT NOW so the Queue never shows a
// patient card twice while waiting for the next sync to clean the DB up —
// keeping the copy synced most recently, same tie-break as the DB cleanup.
function dedupeQueueItems(items: QueueItem[]): QueueItem[] {
  const bestByKey = new Map<string, QueueItem>();
  for (const item of items) {
    const key = item.serverId ?? item.id;
    const existing = bestByKey.get(key);
    if (!existing) {
      bestByKey.set(key, item);
      continue;
    }
    const existingSyncedAt = existing.syncedAt ? new Date(existing.syncedAt).getTime() : 0;
    const itemSyncedAt = item.syncedAt ? new Date(item.syncedAt).getTime() : 0;
    if (itemSyncedAt > existingSyncedAt) bestByKey.set(key, item);
  }
  return Array.from(bestByKey.values());
}

// `results.map(...)` builds a fresh array on every reactive emission, even
// when the underlying set of returned-for-correction ids hasn't changed —
// setting state to that new-but-equal array would re-trigger the two
// effects below (and their DB re-subscribes) on every single tick.
function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, i) => id === sortedB[i]);
}

function todayRange(): { start: string; end: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

// Samples in scope for "the Queue": ASSIGNED/PROCESSING by status — minus
// anything whose latest result means the MedTech has nothing left to do
// (finishedServerIds) — OR returned-for-correction by server_id regardless
// of specimen status (it may already be COMPLETED — the correction flag
// lives on the result, not the specimen).
function baseClause(returnedServerIds: string[], finishedServerIds: string[]): Q.Clause {
  const statusClause =
    finishedServerIds.length === 0
      ? Q.where('status', Q.oneOf(QUEUE_STATUSES))
      : Q.and(
          Q.where('status', Q.oneOf(QUEUE_STATUSES)),
          Q.where('server_id', Q.notIn(finishedServerIds)),
        );

  if (returnedServerIds.length === 0) return statusClause;
  return Q.or(statusClause, Q.where('server_id', Q.oneOf(returnedServerIds)));
}

function buildQuery(
  filter: FilterOption,
  returnedServerIds: string[],
  finishedServerIds: string[],
): Q.Clause[] {
  switch (filter) {
    case 'DATE': {
      const { start, end } = todayRange();
      return [
        baseClause(returnedServerIds, finishedServerIds),
        Q.where('received_at', Q.gte(start)),
        Q.where('received_at', Q.lte(end)),
        Q.sortBy('received_at', Q.desc),
      ];
    }
    case 'LATEST':
      return [baseClause(returnedServerIds, finishedServerIds), Q.sortBy('received_at', Q.desc)];
    case 'EARLIEST':
      return [baseClause(returnedServerIds, finishedServerIds), Q.sortBy('received_at', Q.asc)];
    case 'STATUS':
      return [baseClause(returnedServerIds, finishedServerIds)];
    case 'ASSIGNED':
      return finishedServerIds.length === 0
        ? [Q.where('status', 'ASSIGNED')]
        : [Q.where('status', 'ASSIGNED'), Q.where('server_id', Q.notIn(finishedServerIds))];
    case 'PROCESSING':
      return finishedServerIds.length === 0
        ? [Q.where('status', 'PROCESSING')]
        : [Q.where('status', 'PROCESSING'), Q.where('server_id', Q.notIn(finishedServerIds))];
    case 'RETURNED':
      return [
        Q.where(
          'server_id',
          Q.oneOf(returnedServerIds.length ? returnedServerIds : NO_RETURNED_SENTINEL),
        ),
      ];
    case 'ALL':
    default:
      return [baseClause(returnedServerIds, finishedServerIds)];
  }
}

export interface UseQueueResult {
  items: QueueItem[];
  allItems: QueueItem[];
  isLoading: boolean;
  filter: FilterOption;
  setFilter: (f: FilterOption) => void;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
  lastSyncAt: number | null;
}

export function useQueue(): UseQueueResult {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [allItems, setAllItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [returnedServerIds, setReturnedServerIds] = useState<string[]>([]);
  const [finishedServerIds, setFinishedServerIds] = useState<string[]>([]);
  const { isOnline } = useNetworkStatus();

  const loadLastSyncAt = useCallback(async () => {
    const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
    setLastSyncAt(raw ? new Date(raw).getTime() : null);
  }, []);

  useEffect(() => {
    loadLastSyncAt();
  }, [loadLastSyncAt]);

  // Filtered list — changes with the active filter and with which specimens
  // are currently flagged returned-for-correction or finished.
  useEffect(() => {
    const clauses = buildQuery(filter, returnedServerIds, finishedServerIds);
    const returnedSet = new Set(returnedServerIds);
    const subscription = observeQuery(
      database.get<Specimen>('specimens').query(...clauses),
      (specimens) => {
        setItems(dedupeQueueItems(specimens.map((s) => specimenToQueueItem(s, returnedSet))));
        setIsLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, [filter, returnedServerIds, finishedServerIds]);

  // Unfiltered totals — always the full active queue for stats card
  useEffect(() => {
    const returnedSet = new Set(returnedServerIds);
    const subscription = observeQuery(
      database.get<Specimen>('specimens').query(baseClause(returnedServerIds, finishedServerIds)),
      (specimens) => {
        setAllItems(dedupeQueueItems(specimens.map((s) => specimenToQueueItem(s, returnedSet))));
      },
    );

    return () => subscription.unsubscribe();
  }, [returnedServerIds, finishedServerIds]);

  // Tracks each specimen's LATEST result (by server_id) — feeds the two
  // subscriptions above with two derived sets:
  //  - returnedServerIds: latest result is RETURNED_FOR_CORRECTION — stays
  //    in the Queue (SRS UC 3.4) no matter what specimen.status says.
  //  - finishedServerIds: latest result means the MedTech's part is done
  //    (confirmed and awaiting/through Supervisor review) — excluded from
  //    the Queue even though the backend leaves specimen.status at ASSIGNED
  //    all the way through Supervisor approval; only COMPLETED/REJECTED
  //    ever move it out, and COMPLETED only lands once approved/released.
  // Fetches every result (not pre-filtered by status): although the backend
  // enforces exactly one analysis_results row per specimen, a past sync bug
  // could still leave more than one *locally* (dedupeByServerId cleans this
  // up on sync, but this local computation is a second, immediate line of
  // defense) — only the latest one should ever decide a specimen's state.
  useEffect(() => {
    const subscription = observeQuery(
      database.get<AnalysisResult>('analysis_results').query(),
      (results) => {
        const latest = Array.from(latestAnalysisResultsBySpecimen(results).values());
        const nextReturned = latest
          .filter((r) => r.status === RETURNED_RESULT_STATUS)
          .map((r) => r.specimenId);
        const nextFinished = latest
          .filter((r) => FINISHED_RESULT_STATUSES.includes(r.status))
          .map((r) => r.specimenId);
        setReturnedServerIds((prev) => (sameIds(prev, nextReturned) ? prev : nextReturned));
        setFinishedServerIds((prev) => (sameIds(prev, nextFinished) ? prev : nextFinished));
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isOnline) {
      synchronize()
        .finally(loadLastSyncAt)
        .catch(() => {});
    }
  }, [isOnline, loadLastSyncAt]);

  const refresh = useCallback(async () => {
    if (!isOnline) return;
    setIsRefreshing(true);
    try {
      await synchronize();
    } finally {
      setIsRefreshing(false);
      await loadLastSyncAt();
    }
  }, [isOnline, loadLastSyncAt]);

  return { items, allItems, isLoading, filter, setFilter, refresh, isRefreshing, lastSyncAt };
}
