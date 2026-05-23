import { useEffect, useState, useCallback } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@db/database';
import Specimen from '@db/models/Specimen';
import { synchronize } from '@db/sync/syncManager';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import type { QueueItem, FilterOption, PriorityLevel, SpecimenStatus } from '../types';

const QUEUE_STATUSES: SpecimenStatus[] = ['ASSIGNED', 'IN_QUEUE'];

function specimenToQueueItem(s: Specimen): QueueItem {
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
  };
}

function todayRange(): { start: string; end: string } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function buildQuery(filter: FilterOption): Q.Clause[] {
  switch (filter) {
    case 'DATE': {
      const { start, end } = todayRange();
      return [
        Q.where('status', Q.oneOf(QUEUE_STATUSES)),
        Q.where('received_at', Q.gte(start)),
        Q.where('received_at', Q.lte(end)),
        Q.sortBy('received_at', Q.desc),
      ];
    }
    case 'LATEST':
      return [
        Q.where('status', Q.oneOf(QUEUE_STATUSES)),
        Q.sortBy('received_at', Q.desc),
      ];
    case 'EARLIEST':
      return [
        Q.where('status', Q.oneOf(QUEUE_STATUSES)),
        Q.sortBy('received_at', Q.asc),
      ];
    case 'PRIORITY':
      return [
        Q.where('status', Q.oneOf(QUEUE_STATUSES)),
        Q.where('priority_level', Q.oneOf(['HIGH', 'NORMAL', 'LOW', 'ROUTINE'])),
      ];
    case 'HIGH':
      return [
        Q.where('status', Q.oneOf(QUEUE_STATUSES)),
        Q.where('priority_level', 'HIGH'),
      ];
    case 'NORMAL':
      return [
        Q.where('status', Q.oneOf(QUEUE_STATUSES)),
        Q.where('priority_level', 'NORMAL'),
      ];
    case 'LOW':
      return [
        Q.where('status', Q.oneOf(QUEUE_STATUSES)),
        Q.where('priority_level', 'LOW'),
      ];
    case 'ROUTINE':
      return [
        Q.where('status', Q.oneOf(QUEUE_STATUSES)),
        Q.where('priority_level', 'ROUTINE'),
      ];
    case 'STATUS':
      return [Q.where('status', Q.oneOf(QUEUE_STATUSES))];
    case 'ASSIGNED':
      return [Q.where('status', 'ASSIGNED')];
    case 'IN_QUEUE':
      return [Q.where('status', 'IN_QUEUE')];
    case 'PROCESSING':
      return [Q.where('status', 'PROCESSING')];
    case 'ALL':
    default:
      return [Q.where('status', Q.oneOf(QUEUE_STATUSES))];
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
}

export function useQueue(): UseQueueResult {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [allItems, setAllItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isOnline } = useNetworkStatus();

  // Filtered list — changes with the active filter
  useEffect(() => {
    const clauses = buildQuery(filter);
    const subscription = database
      .get<Specimen>('specimens')
      .query(...clauses)
      .observe()
      .subscribe((specimens) => {
        setItems(specimens.map(specimenToQueueItem));
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [filter]);

  // Unfiltered totals — always the full active queue for stats card
  useEffect(() => {
    const subscription = database
      .get<Specimen>('specimens')
      .query(Q.where('status', Q.oneOf(QUEUE_STATUSES)))
      .observe()
      .subscribe((specimens) => {
        setAllItems(specimens.map(specimenToQueueItem));
      });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isOnline) {
      synchronize().catch(() => {});
    }
  }, [isOnline]);

  const refresh = useCallback(async () => {
    if (!isOnline) return;
    setIsRefreshing(true);
    try {
      await synchronize();
    } finally {
      setIsRefreshing(false);
    }
  }, [isOnline]);

  return { items, allItems, isLoading, filter, setFilter, refresh, isRefreshing };
}
