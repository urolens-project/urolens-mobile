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
      ];
    }
    case 'PRIORITY':
      return [
        Q.where('status', Q.oneOf(QUEUE_STATUSES)),
        Q.where('priority_level', Q.oneOf(['HIGH', 'NORMAL', 'LOW'])),
      ];
    case 'HIGH':
      return [
        Q.where('status', Q.oneOf(QUEUE_STATUSES)),
        Q.where('priority_level', 'HIGH'),
      ];
    case 'NORMAL':
      return [
        Q.where('status', Q.oneOf(QUEUE_STATUSES)),
        Q.where('priority_level', Q.oneOf(['NORMAL', 'LOW'])),
      ];
    case 'STATUS':
      return [Q.where('status', Q.oneOf(QUEUE_STATUSES))];
    case 'ASSIGNED':
      return [Q.where('status', 'ASSIGNED')];
    case 'PROCESSING':
      return [Q.where('status', Q.oneOf(['PROCESSING', 'IN_PROGRESS']))];
    case 'ALL':
    default:
      return [Q.where('status', Q.oneOf(QUEUE_STATUSES))];
  }
}

export interface UseQueueResult {
  items: QueueItem[];
  isLoading: boolean;
  filter: FilterOption;
  setFilter: (f: FilterOption) => void;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

export function useQueue(): UseQueueResult {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterOption>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isOnline } = useNetworkStatus();

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

  return { items, isLoading, filter, setFilter, refresh, isRefreshing };
}
