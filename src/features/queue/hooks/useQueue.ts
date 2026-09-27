import { useCallback, useEffect, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '@db/database';
import { observeQuery } from '@db/observeQuery';
import { latestAnalysisResultsBySpecimen } from '@db/latestAnalysisResultsBySpecimen';
import Specimen from '@db/models/Specimen';
import AnalysisResult from '@db/models/AnalysisResult';
import { synchronize, LAST_SYNC_KEY } from '@db/sync/syncManager';
import { useNetworkStatus } from '@hooks/useNetworkStatus';

import { orderByStatus } from '../status';
import { baseClause, buildQuery, FINISHED_RESULT_STATUSES, RETURNED_RESULT_STATUS } from '../lib/queueQuery';
import { dedupeQueueItems, sameIds, specimenToQueueItem } from '../lib/queueItemMapping';
import type { FilterOption, QueueItem } from '../types';

export { buildQuery } from '../lib/queueQuery';

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

/**
 * @description Loads the medtech's queue from the local DB and keeps it in sync: three
 * live WatermelonDB subscriptions (filtered list, unfiltered totals, and each
 * specimen's latest result) plus a manual `refresh` that triggers a sync.
 */
export function useQueue(): UseQueueResult {
  const { isOnline } = useNetworkStatus();

  const [items, setItems] = useState<QueueItem[]>([]);
  const [allItems, setAllItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [returnedServerIds, setReturnedServerIds] = useState<string[]>([]);
  const [finishedServerIds, setFinishedServerIds] = useState<string[]>([]);

  const loadLastSyncAt = useCallback(async (): Promise<void> => {
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
        const next = dedupeQueueItems(specimens.map((s) => specimenToQueueItem(s, returnedSet)));
        // All (and the Status chip, which lists the same samples) read best with
        // what needs attention first: Returned, then In Progress, then Assigned.
        // The status of a sample is derived (a returned flag on its result), so this
        // can't be a database sort — it's applied here instead.
        setItems(filter === 'ALL' || filter === 'STATUS' ? orderByStatus(next) : next);
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

  const refresh = useCallback(async (): Promise<void> => {
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
