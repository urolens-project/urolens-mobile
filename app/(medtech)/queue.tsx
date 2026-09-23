import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, View, FlatList, RefreshControl, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useAuthStore } from '@lib/auth/authStore';
import { DropReveal, useReduceMotion } from '@components/DropReveal';
import { RiseIn } from '@components/RiseIn';
import { useQueue } from '../../src/features/queue/hooks/useQueue';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { useSyncStatus } from '@hooks/useSyncStatus';
import { formatClinicToday } from '@lib/dateTime';
import { QUEUE_STATUS_STYLES } from '../../src/features/queue/constants';
import { getQueueStatus } from '../../src/features/queue/status';
import { getSyncPill } from '../../src/features/queue/syncPill';
import {
  ITEM_GAP,
  ITEM_STRIDE,
  getStickyRest,
  getWheelRange,
  rollAwayStyle,
} from '../../src/features/queue/scrollEffects';
import { QueueActionBar } from '../../src/features/queue/components/QueueActionBar';
import { getSampleActions } from '../../src/features/queue/lib/sampleState';
import { QueueEmptyState } from '../../src/features/queue/components/QueueEmptyState';
import { QueueFilterBar } from '../../src/features/queue/components/QueueFilterBar';
import { QueueHeader } from '../../src/features/queue/components/QueueHeader';
import { QueueItemCard } from '../../src/features/queue/components/QueueItemCard';
import { QueueStatsCard } from '../../src/features/queue/components/QueueStatsCard';
import { StickyFilters } from '../../src/features/queue/components/StickyFilters';
import { SyncStatusPill } from '../../src/features/queue/components/SyncStatusPill';
import type { QueueItem } from '../../src/features/queue/types';

const TEAL = '#2E7D7A';

// Number of rows that get the drop-in entrance; anything further down is just shown,
// so scrolling a long list never re-triggers animation.
const ANIMATED_ROWS = 8;
const ROW_STAGGER_MS = 90;
const CARD_RADIUS = 20;

// Layout the scroll effects are worked out from (see scrollEffects).
const LIST_PADDING_TOP = 16;
const BLOCK_GAP = 14;
// Air between the pinned filters and the first row.
const FILTERS_BOTTOM_SPACE = 6;

// The list reports its scroll position on the native thread, so the effects below track
// the finger exactly without waking the JS thread.
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as unknown as typeof FlatList;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatLastSync(lastSyncAt: number | null): string {
  if (!lastSyncAt) return 'Not yet synced';
  const diffMin = Math.floor((Date.now() - lastSyncAt) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function ItemSeparator() {
  return <View style={styles.separator} />;
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function QueueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetworkStatus();
  const { username } = useAuthStore();
  const {
    items: dbItems,
    allItems: dbAllItems,
    isLoading,
    filter,
    setFilter,
    refresh,
    isRefreshing,
    lastSyncAt,
  } = useQueue();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Motion: skipped for users who ask for reduced motion, and ambient (looping) motion
  // stops while the tab is out of view — tabs stay mounted, so it would keep running.
  const reduceMotion = useReduceMotion();
  const isFocused = useIsFocused();
  const live = isFocused && !reduceMotion;

  // The header is teal, so this tab needs light status-bar text; the tabs with a white
  // header (and this one when left) need dark. Tabs stay mounted, so set it on focus and
  // put it back on blur rather than relying on a <StatusBar> element that only applies
  // when it mounts.
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content', true);
      return () => StatusBar.setBarStyle('dark-content', true);
    }, []),
  );

  // Bumped each time the tab is entered again, replaying the entrance animations. The
  // first entry plays from the components' own mount, so it's skipped here.
  const [playKey, setPlayKey] = useState(0);
  const isFirstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      setPlayKey((key) => key + 1);
    }, []),
  );

  // ── Scroll: the filters pin under the header; the rest rolls away beneath them ──
  const scrollY = useRef(new Animated.Value(0)).current;
  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: true,
      }),
    [scrollY],
  );
  // Measured, because they change: the stats block with its content, the filter bar when a
  // filter row opens, the whole list header with both.
  const [topBlockHeight, setTopBlockHeight] = useState(0);
  const [filtersHeight, setFiltersHeight] = useState(0);
  const [listHeaderHeight, setListHeaderHeight] = useState(0);

  const stickyRest = getStickyRest(LIST_PADDING_TOP, topBlockHeight, BLOCK_GAP);
  // Where the first row starts, and the line under the pinned filters that rows roll into.
  const rowsTop = LIST_PADDING_TOP + listHeaderHeight;
  const pinBottom = filtersHeight;
  // The stats block rolls away over the first stretch of scrolling, until the filters cover it.
  const topBlockRoll = reduceMotion
    ? undefined
    : rollAwayStyle(scrollY, {
        start: 0,
        end: LIST_PADDING_TOP + topBlockHeight - pinBottom,
      });

  // allItems: always the full unfiltered queue — used for stats card
  const allItems: QueueItem[] = dbAllItems;
  // items: filtered list shown in the FlatList
  const items: QueueItem[] = dbItems;

  // Each active sample counts once, under the status it's shown with — a returned
  // sample is a Returned sample, even though its specimen still reads ASSIGNED.
  const counts = useMemo(() => {
    const totals = { assigned: 0, inProgress: 0, returned: 0 };
    for (const item of allItems) {
      const status = getQueueStatus(item);
      if (status === 'RETURNED') totals.returned += 1;
      else if (status === 'PROCESSING') totals.inProgress += 1;
      else if (status === 'ASSIGNED') totals.assigned += 1;
    }
    return totals;
  }, [allItems]);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const syncStatus = useSyncStatus();
  const syncPill = getSyncPill({ isOnline, sync: syncStatus, lastSyncAt });

  // Work already started (or sent back) is picked up again, not begun.
  const selectedStatus = selectedItem ? getQueueStatus(selectedItem) : null;
  const proceedLabel =
    selectedStatus === 'PROCESSING' || selectedStatus === 'RETURNED'
      ? 'Continue'
      : 'Proceed to Analysis';

  // A returned sample's result is with the Supervisor's workflow, so it can't be rejected.
  const canRejectSelected = selectedItem
    ? getSampleActions(
        selectedItem.status,
        selectedItem.isReturnedForCorrection ? 'RETURNED_FOR_CORRECTION' : null,
      ).canReject
    : true;

  const handleItemPress = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  // Opens the sample detail. The sample only becomes In Progress once the
  // MedTech taps "Begin Analysis" there (see features/queue/lib/startAnalysis).
  function handleProceed() {
    if (!selectedItem) return;
    router.push({
      pathname: '/(medtech)/sample/[id]',
      params: { id: selectedItem.id },
    });
  }

  function handleReject() {
    if (selectedItem) router.push(`/(medtech)/sample/reject/${selectedItem.id}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <QueueHeader
        username={username}
        activeCount={allItems.length}
        dateLabel={formatClinicToday()}
        topInset={insets.top}
        playKey={playKey}
        reduceMotion={reduceMotion}
        live={live}
        syncing={syncStatus.state === 'syncing' || isRefreshing}
        syncDisabled={!isOnline || isRefreshing}
        onSync={refresh}
      />

      {/* ── List ── */}
      <View style={styles.listArea}>
        <AnimatedFlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const status = getQueueStatus(item);
            const roll = reduceMotion
              ? undefined
              : rollAwayStyle(scrollY, getWheelRange(rowsTop + index * ITEM_STRIDE, pinBottom));
            return (
              <Animated.View style={roll}>
                <DropReveal
                  index={index}
                  playKey={playKey}
                  reduceMotion={reduceMotion || index >= ANIMATED_ROWS}
                  accent={status ? QUEUE_STATUS_STYLES[status].color : TEAL}
                  radius={CARD_RADIUS}
                  staggerMs={ROW_STAGGER_MS}
                >
                  <QueueItemCard
                    item={item}
                    onPress={handleItemPress}
                    selected={item.id === selectedId}
                    live={live}
                  />
                </DropReveal>
              </Animated.View>
            );
          }}
          ItemSeparatorComponent={ItemSeparator}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refresh}
              tintColor={TEAL}
              enabled={isOnline}
            />
          }
          ListHeaderComponent={
            <View onLayout={(e) => setListHeaderHeight(e.nativeEvent.layout.height)}>
              {/* Scrolls away: rolls up and under the pinned filters. */}
              <Animated.View
                style={[styles.topBlock, topBlockRoll]}
                onLayout={(e) => setTopBlockHeight(e.nativeEvent.layout.height)}
              >
                {/* Connection / sync status */}
                <RiseIn playKey={playKey} reduceMotion={reduceMotion} style={styles.pillRow}>
                  <SyncStatusPill pill={syncPill} live={live} />
                </RiseIn>

                {/* Stats card */}
                <RiseIn playKey={playKey} reduceMotion={reduceMotion} delay={80}>
                  <QueueStatsCard
                    counts={counts}
                    lastSync={formatLastSync(lastSyncAt)}
                    reduceMotion={reduceMotion}
                  />
                </RiseIn>
              </Animated.View>

              {/* Room for the filters, which sit over the list (below) rather than in it. */}
              <View style={{ height: BLOCK_GAP + filtersHeight + FILTERS_BOTTOM_SPACE }} />
            </View>
          }
          ListEmptyComponent={
            isLoading ? null : (
              <QueueEmptyState isOnline={isOnline} filter={filter} reduceMotion={reduceMotion} />
            )
          }
          contentContainerStyle={[styles.list, items.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
        />

        {/* Filter bar: follows the scroll up, then stays pinned under the header. */}
        <StickyFilters scrollY={scrollY} restY={stickyRest} onHeight={setFiltersHeight}>
          <RiseIn playKey={playKey} reduceMotion={reduceMotion} delay={160}>
            <QueueFilterBar
              selected={filter}
              onChange={setFilter}
              counts={{
                ALL: allItems.length,
                ASSIGNED: counts.assigned,
                PROCESSING: counts.inProgress,
                RETURNED: counts.returned,
              }}
            />
          </RiseIn>
        </StickyFilters>
      </View>

      {/* ── Bottom action bar ── */}
      <QueueActionBar
        item={selectedItem}
        proceedLabel={proceedLabel}
        canReject={canRejectSelected}
        onReject={handleReject}
        onProceed={handleProceed}
        reduceMotion={reduceMotion}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  // Holds the list and the filters laid over it.
  listArea: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: LIST_PADDING_TOP,
    paddingBottom: 140,
  },
  listEmpty: {
    flex: 1,
  },
  topBlock: {
    gap: BLOCK_GAP,
  },
  pillRow: {
    paddingHorizontal: 2,
  },
  separator: {
    height: ITEM_GAP,
  },
});
