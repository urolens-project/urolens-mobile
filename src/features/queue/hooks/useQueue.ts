import { useCallback, useEffect, useMemo, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Query } from '@nozbe/watermelondb';
import { database } from '@db/database';
import { observeQuery } from '@db/observeQuery';
import { latestAnalysisResultsBySpecimen } from '@db/latestAnalysisResultsBySpecimen';
import type Specimen from '@db/models/Specimen';
import type AnalysisResult from '@db/models/AnalysisResult';
import { synchronize, LAST_SYNC_KEY } from '@db/sync/syncManager';
import { useAsyncAction } from '@hooks/useAsyncAction';
import { useNetworkStatus } from '@hooks/useNetworkStatus';

import {
  QUEUE_PAGE_SIZE,
  QUEUE_RESULT_COLUMNS,
  QUEUE_SPECIMEN_COLUMNS,
} from '../constants/queue.constant';
import { orderByStatus } from '../status';
import {
  baseClause,
  buildQuery,
  FINISHED_RESULT_STATUSES,
  RETURNED_RESULT_STATUS,
} from '../lib/queueQuery';
import { dedupeQueueItems, sameIds, specimenToQueueItem } from '../lib/queueItemMapping';
import type { FilterOption, QueueItem } from '../types';

type QueueSource = 'items' | 'totals' | 'results';

export interface UseQueueResult {
  items: QueueItem[];
  allItems: QueueItem[];
  isLoading: boolean;
  error: Error | null;
  filter: FilterOption;
  setFilter: (filter: FilterOption) => void;
  refresh: () => Promise<void>;
  isRefreshing: boolean;
  lastSyncAt: number | null;
  page: number;
  pageCount: number;
  totalItems: number;
  nextPage: () => void;
  previousPage: () => void;
}

/**
 * @description Keeps the actionable queue and totals live offline, and pages the filtered list.
 */
export function useQueue(): UseQueueResult {
  const { isOnline } = useNetworkStatus();
  const [filteredItems, setFilteredItems] = useState<QueueItem[]>([]);
  const [allItems, setAllItems] = useState<QueueItem[]>([]);
  const [filter, setActiveFilter] = useState<FilterOption>('ALL');
  const [requestedPage, setRequestedPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [loadedSources, setLoadedSources] = useState<Partial<Record<QueueSource, boolean>>>({});
  const [sourceErrors, setSourceErrors] = useState<Partial<Record<QueueSource, Error | null>>>({});
  const [returnedServerIds, setReturnedServerIds] = useState<string[]>([]);
  const [finishedServerIds, setFinishedServerIds] = useState<string[]>([]);
  const [returnReasons, setReturnReasons] = useState<Map<string, string | null>>(new Map());
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / QUEUE_PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  const items = useMemo((): QueueItem[] => {
    const offset = (page - 1) * QUEUE_PAGE_SIZE;
    return filteredItems.slice(offset, offset + QUEUE_PAGE_SIZE).map(
      (item): QueueItem => ({
        ...item,
        returnReason:
          item.isReturnedForCorrection && item.serverId
            ? (returnReasons.get(item.serverId) ?? null)
            : null,
      }),
    );
  }, [filteredItems, page, returnReasons]);

  const handleSourceLoaded = useCallback((source: QueueSource): void => {
    setLoadedSources(
      (previous): Partial<Record<QueueSource, boolean>> => ({ ...previous, [source]: true }),
    );
    setSourceErrors(
      (previous): Partial<Record<QueueSource, Error | null>> => ({ ...previous, [source]: null }),
    );
  }, []);
  const handleSourceError = useCallback((source: QueueSource, error: Error): void => {
    setSourceErrors(
      (previous): Partial<Record<QueueSource, Error | null>> => ({ ...previous, [source]: error }),
    );
  }, []);
  const syncQueue = useCallback(
    async (signal: AbortSignal): Promise<void> => {
      try {
        if (isOnline) await synchronize();
      } finally {
        const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
        const timestamp = raw ? new Date(raw).getTime() : NaN;
        if (!signal.aborted) setLastSyncAt(Number.isFinite(timestamp) ? timestamp : null);
      }
    },
    [isOnline],
  );
  const { run, isLoading: isRefreshing, error: syncError } = useAsyncAction('Queue', syncQueue);

  useEffect((): (() => void) => {
    const returnedSet = new Set(returnedServerIds);
    const subscription = observeQuery(
      (): Query<Specimen> =>
        database
          .get<Specimen>('specimens')
          .query(...buildQuery(filter, returnedServerIds, finishedServerIds)),
      (specimens): void => {
        const next = dedupeQueueItems(
          specimens.map((specimen): QueueItem => specimenToQueueItem(specimen, returnedSet)),
        );
        setFilteredItems(filter === 'ALL' || filter === 'STATUS' ? orderByStatus(next) : next);
        handleSourceLoaded('items');
      },
      {
        columns: QUEUE_SPECIMEN_COLUMNS,
        onError: (error): void => handleSourceError('items', error),
      },
    );
    return (): void => subscription.unsubscribe();
  }, [
    filter,
    returnedServerIds,
    finishedServerIds,
    reloadKey,
    handleSourceLoaded,
    handleSourceError,
  ]);

  useEffect((): (() => void) => {
    const returnedSet = new Set(returnedServerIds);
    const subscription = observeQuery(
      (): Query<Specimen> =>
        database.get<Specimen>('specimens').query(baseClause(returnedServerIds, finishedServerIds)),
      (specimens): void => {
        setAllItems(
          dedupeQueueItems(
            specimens.map((specimen): QueueItem => specimenToQueueItem(specimen, returnedSet)),
          ),
        );
        handleSourceLoaded('totals');
      },
      {
        columns: QUEUE_SPECIMEN_COLUMNS,
        onError: (error): void => handleSourceError('totals', error),
      },
    );
    return (): void => subscription.unsubscribe();
  }, [returnedServerIds, finishedServerIds, reloadKey, handleSourceLoaded, handleSourceError]);

  useEffect((): (() => void) => {
    const subscription = observeQuery(
      (): Query<AnalysisResult> => database.get<AnalysisResult>('analysis_results').query(),
      (results): void => {
        const latest = Array.from(latestAnalysisResultsBySpecimen(results).values());
        const returned = latest.filter(
          (result): boolean => result.status === RETURNED_RESULT_STATUS,
        );
        const nextReturned = returned.map((result): string => result.specimenId);
        const nextFinished = latest
          .filter((result): boolean => FINISHED_RESULT_STATUSES.includes(result.status))
          .map((result): string => result.specimenId);
        setReturnedServerIds((previous): string[] =>
          sameIds(previous, nextReturned) ? previous : nextReturned,
        );
        setFinishedServerIds((previous): string[] =>
          sameIds(previous, nextFinished) ? previous : nextFinished,
        );
        setReturnReasons(
          new Map(
            returned.map((result): [string, string | null] => [
              result.specimenId,
              result.returnReason ?? null,
            ]),
          ),
        );
        handleSourceLoaded('results');
      },
      {
        columns: QUEUE_RESULT_COLUMNS,
        onError: (error): void => handleSourceError('results', error),
      },
    );
    return (): void => subscription.unsubscribe();
  }, [reloadKey, handleSourceLoaded, handleSourceError]);

  useEffect((): void => {
    void run();
  }, [run]);
  useEffect((): void => {
    setRequestedPage(page);
  }, [page]);

  const setFilter = useCallback((nextFilter: FilterOption): void => {
    setActiveFilter(nextFilter);
    setRequestedPage(1);
  }, []);
  const refresh = useCallback(async (): Promise<void> => {
    setSourceErrors({});
    setLoadedSources({});
    setReloadKey((previous): number => previous + 1);
    await run();
  }, [run]);
  const nextPage = useCallback(
    (): void => setRequestedPage(Math.min(page + 1, pageCount)),
    [page, pageCount],
  );
  const previousPage = useCallback((): void => setRequestedPage(Math.max(1, page - 1)), [page]);
  const error = sourceErrors.items ?? sourceErrors.totals ?? sourceErrors.results ?? syncError;
  const hasLoadedQueue = loadedSources.items && loadedSources.totals && loadedSources.results;
  const isLoading = !error && (!hasLoadedQueue || (isRefreshing && allItems.length === 0));

  return {
    items,
    allItems,
    isLoading,
    error,
    filter,
    setFilter,
    refresh,
    isRefreshing,
    lastSyncAt,
    page,
    pageCount,
    totalItems: filteredItems.length,
    nextPage,
    previousPage,
  };
}
