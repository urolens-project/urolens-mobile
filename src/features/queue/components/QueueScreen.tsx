import { Animated, View, FlatList, RefreshControl, StyleSheet } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatClinicToday } from '@lib/dateTime';
import { colors, spacing } from '@src/theme';

import { RiseIn } from '@components/RiseIn';

import { useQueue } from '../hooks/useQueue';
import { QUEUE_STATUS_STYLES } from '../constants';
import { getQueueStatus } from '../status';
import { getSyncPill } from '../syncPill';
import {
  ITEM_GAP,
  ITEM_STRIDE,
  getStickyRest,
  getWheelRange,
  rollAwayStyle,
} from '../scrollEffects';
import { QueueActionBar } from './QueueActionBar';
import { QueueLoadState } from './QueueLoadState';
import { QueuePagination } from './QueuePagination';
import { QueueFilterBar } from './QueueFilterBar';
import { QueueHeader } from './QueueHeader';
import { QueueListRow } from './QueueListRow';
import { QueueListHeader } from './QueueListHeader';
import { StickyFilters } from './StickyFilters';
import type { QueueItem } from '../types';

const LIST_PADDING_TOP = spacing.lg;
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as unknown as typeof FlatList;

/**
 * @description Presents actionable samples, live totals and offline sync feedback for the MedTech.
 */
export function QueueScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const {
    items,
    allItems,
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

  // Returned results are back with the MedTech and may be rejected.
  const canRejectSelected = selectedItem
    ? getSampleActions(
        selectedItem.status,
        selectedItem.isReturnedForCorrection ? 'RETURNED_FOR_CORRECTION' : null,
      ).canReject
    : true;

  const handleItemPress = useCallback((id: string): void => {
    setSelectedId((prev) => (prev === id ? null : id));
  }, []);

  // Opens the sample detail. The sample only becomes In Progress once the
  // MedTech taps "Begin Analysis" there (see features/queue/lib/startAnalysis).
  const handleProceed = useCallback((): void => {
    if (!selectedItem) return;
    router.push({
      pathname: '/(medtech)/sample/[id]',
      params: { id: selectedItem.id },
    });
  }, [router, selectedItem]);

  const handleReject = useCallback((): void => {
    if (selectedItem) router.push(`/(medtech)/sample/reject/${selectedItem.id}`);
  }, [router, selectedItem]);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <QueueHeader
        username={username}
        activeCount={allItems.length}
        dateLabel={formatClinicToday()}
        topInset={insets.top}
        playKey={playKey}
        reduceMotion={reduceMotion}
        live={isLive}
        syncing={isSyncing}
        syncDisabled={!isOnline || isRefreshing}
        onSync={refresh}
      />

      <View style={styles.listArea}>
        <AnimatedFlatList
          ref={listRef}
          data={items}
          keyExtractor={(item): string => item.id}
          renderItem={({ item, index }: ListRenderItemInfo<QueueItem>): React.JSX.Element => (
            <QueueListRow
              item={item}
              index={index}
              scrollY={scrollY}
              rowsTop={rowsTop}
              pinBottom={filtersHeight}
              playKey={playKey}
              reduceMotion={reduceMotion}
              hasVariableRows={hasVariableRows}
              isLive={isLive}
              isSelected={item.id === selectedItem?.id}
              onPress={handleItemPress}
            />
          )}
          ItemSeparatorComponent={ItemSeparator}
          onScroll={onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={colors.teal} />
          }
          ListHeaderComponent={
            <QueueListHeader
              counts={counts}
              lastSyncAt={lastSyncAt}
              syncPill={syncPill}
              playKey={playKey}
              reduceMotion={reduceMotion}
              isLive={isLive}
              rollStyle={topBlockRoll}
              filtersHeight={filtersHeight}
              hasItems={items.length > 0}
              error={error}
              isOnline={isOnline}
              filter={filter}
              onRetry={refresh}
              onLayout={handleListHeaderLayout}
              onTopBlockLayout={handleTopBlockLayout}
            />
          }
          ListEmptyComponent={
            <QueueLoadState
              isLoading={isLoading}
              error={error}
              hasActiveSamples={allItems.length > 0}
              isOnline={isOnline}
              filter={filter}
              reduceMotion={reduceMotion}
              onRetry={refresh}
            />
          }
          ListFooterComponent={
            <QueuePagination
              page={page}
              pageCount={pageCount}
              totalItems={totalItems}
              onNext={nextPage}
              onPrevious={previousPage}
            />
          }
          contentContainerStyle={[styles.list, items.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
        />

        <StickyFilters scrollY={scrollY} restY={stickyRest} onHeight={handleFiltersHeight}>
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
function ItemSeparator(): React.JSX.Element {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray100,
  },
  listArea: {
    flex: 1,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: LIST_PADDING_TOP,
    paddingBottom: spacing.jumbo * 3,
  },
  listEmpty: {
    flex: 1,
  },
  separator: {
    height: ITEM_GAP,
  },
});
