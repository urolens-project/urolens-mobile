import { Animated, View, FlatList, RefreshControl, StyleSheet } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatClinicToday } from '@lib/dateTime';
import { colors, spacing } from '@src/theme';

import { RiseIn } from '@components/RiseIn';

import { useQueuePresentation } from '../hooks/useQueuePresentation';
import { ITEM_GAP } from '../scrollEffects';
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
    error,
    page,
    pageCount,
    totalItems,
    nextPage,
    previousPage,
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
  } = useQueuePresentation();
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
