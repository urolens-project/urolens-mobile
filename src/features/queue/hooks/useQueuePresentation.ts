import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Animated, StatusBar } from 'react-native';
import type {
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { useIsFocused } from '@react-navigation/native';
import { useUsername } from '@lib/auth/authStore';
import { useFailedActionCount } from '@hooks/useFailedActionCount';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { useSyncStatus } from '@hooks/useSyncStatus';
import { spacing } from '@src/theme';

import { useReduceMotion } from '@components/DropReveal';

import { useQueue } from './useQueue';
import type { UseQueueResult } from './useQueue';
import { getQueueStatus } from '../status';
import { getSyncPill } from '../syncPill';
import type { SyncPill } from '../syncPill';
import { getStickyRest, rollAwayStyle } from '../scrollEffects';
import type { RollAwayStyle } from '../scrollEffects';
import { getSampleActions } from '../lib/sampleState';
import type { QueueItem } from '../types';

interface QueueCounts {
  assigned: number;
  inProgress: number;
  returned: number;
}

interface UseQueuePresentationResult extends UseQueueResult {
  username: string | null;
  isOnline: boolean;
  isLive: boolean;
  isSyncing: boolean;
  reduceMotion: boolean;
  playKey: number;
  counts: QueueCounts;
  syncPill: SyncPill;
  selectedItem: QueueItem | null;
  proceedLabel: string;
  canRejectSelected: boolean;
  scrollY: Animated.Value;
  listRef: RefObject<FlatList<QueueItem> | null>;
  stickyRest: number;
  rowsTop: number;
  filtersHeight: number;
  topBlockRoll?: RollAwayStyle;
  hasVariableRows: boolean;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  handleListHeaderLayout: (event: LayoutChangeEvent) => void;
  handleTopBlockLayout: (event: LayoutChangeEvent) => void;
  handleFiltersHeight: (height: number) => void;
  handleItemPress: (id: string) => void;
  handleProceed: () => void;
  handleReject: () => void;
}

/**
 * @description Coordinates selection, detail navigation and scroll motion without mixing them into queue fetching.
 */
export function useQueuePresentation(): UseQueuePresentationResult {
  const router = useRouter();
  const username = useUsername();
  const { isOnline } = useNetworkStatus();
  const syncStatus = useSyncStatus();
  const failedActionCount = useFailedActionCount();
  const reduceMotion = useReduceMotion();
  const isFocused = useIsFocused();
  const queue = useQueue();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playKey, setPlayKey] = useState(0);
  const [topBlockHeight, setTopBlockHeight] = useState(0);
  const [filtersHeight, setFiltersHeight] = useState(0);
  const [listHeaderHeight, setListHeaderHeight] = useState(0);
  const counts = useMemo((): QueueCounts => {
    const totals: QueueCounts = { assigned: 0, inProgress: 0, returned: 0 };
    for (const item of queue.allItems) {
      const status = getQueueStatus(item);
      if (status === 'RETURNED') totals.returned += 1;
      else if (status === 'PROCESSING') totals.inProgress += 1;
      else if (status === 'ASSIGNED') totals.assigned += 1;
    }
    return totals;
  }, [queue.allItems]);
  const selectedItem = useMemo(
    (): QueueItem | null => queue.items.find((item): boolean => item.id === selectedId) ?? null,
    [queue.items, selectedId],
  );
  const selectedStatus = selectedItem ? getQueueStatus(selectedItem) : null;
  const proceedLabel =
    selectedStatus === 'PROCESSING' || selectedStatus === 'RETURNED'
      ? 'Continue'
      : 'Proceed to Analysis';
  const canRejectSelected =
    !!selectedItem &&
    getSampleActions(
      selectedItem.status,
      selectedItem.isReturnedForCorrection ? 'RETURNED_FOR_CORRECTION' : null,
    ).canReject;
  const isLive = isFocused && !reduceMotion;
  const isSyncing = syncStatus.state === 'syncing' || queue.isRefreshing;
  const lastSyncAt = syncStatus.lastSuccessAt ?? queue.lastSyncAt;
  const error = useMemo((): Error | null => {
    if (queue.error) return queue.error;
    return isOnline && syncStatus.state === 'failed' ? new Error('Queue sync failed') : null;
  }, [queue.error, syncStatus.state, isOnline]);
  const isLoading = !error && (queue.isLoading || (isSyncing && queue.allItems.length === 0));
  const syncPill = getSyncPill({ isOnline, sync: syncStatus, lastSyncAt, failedActionCount });
  const stickyRest = getStickyRest(spacing.lg, topBlockHeight, spacing.mlg);
  const rowsTop = spacing.lg + listHeaderHeight;
  const hasVariableRows = queue.items.some((item): boolean => item.isReturnedForCorrection);
  const isFirstFocus = useRef(true);
  const scrollY = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<QueueItem>>(null);
  const onScroll = useMemo(
    (): ((event: NativeSyntheticEvent<NativeScrollEvent>) => void) =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY],
  );
  const topBlockRoll = reduceMotion
    ? undefined
    : rollAwayStyle(scrollY, {
        start: 0,
        end: spacing.lg + topBlockHeight - filtersHeight,
      });

  useFocusEffect(
    useCallback((): (() => void) => {
      StatusBar.setBarStyle('light-content', true);
      return (): void => StatusBar.setBarStyle('dark-content', true);
    }, []),
  );
  useFocusEffect(
    useCallback((): void => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      setPlayKey((previous): number => previous + 1);
    }, []),
  );
  useEffect((): void => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setSelectedId(null);
  }, [queue.page, queue.filter]);

  const handleListHeaderLayout = useCallback(
    (event: LayoutChangeEvent): void => setListHeaderHeight(event.nativeEvent.layout.height),
    [],
  );
  const handleTopBlockLayout = useCallback(
    (event: LayoutChangeEvent): void => setTopBlockHeight(event.nativeEvent.layout.height),
    [],
  );
  const handleFiltersHeight = useCallback((height: number): void => setFiltersHeight(height), []);
  const handleItemPress = useCallback((id: string): void => {
    setSelectedId((previous): string | null => (previous === id ? null : id));
  }, []);
  const handleProceed = useCallback((): void => {
    if (!selectedItem) return;
    router.push({ pathname: '/(medtech)/sample/[id]', params: { id: selectedItem.id } });
  }, [router, selectedItem]);
  const handleReject = useCallback((): void => {
    if (selectedItem && canRejectSelected)
      router.push(`/(medtech)/sample/reject/${selectedItem.id}`);
  }, [router, selectedItem, canRejectSelected]);

  return {
    ...queue,
    error,
    isLoading,
    lastSyncAt,
    username,
    isOnline,
    isLive,
    isSyncing,
    reduceMotion,
    playKey,
    counts,
    syncPill,
    selectedItem,
    proceedLabel,
    canRejectSelected,
    scrollY,
    listRef,
    stickyRest,
    rowsTop,
    filtersHeight,
    topBlockRoll,
    hasVariableRows,
    onScroll,
    handleListHeaderLayout,
    handleTopBlockLayout,
    handleFiltersHeight,
    handleItemPress,
    handleProceed,
    handleReject,
  };
}
