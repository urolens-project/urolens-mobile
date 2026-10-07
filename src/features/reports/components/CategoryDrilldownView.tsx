import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  StyleSheet,
} from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { DropReveal } from '@components/DropReveal';

import { reportsApi } from '../api/reportsApi';
import { CategoryHeader } from './CategoryHeader';
import { ReportItemCard } from './ReportItemCard';
import { ReportIllustration } from './ReportIllustration';
import { ReportFilters } from './ReportFilters';
import { ReportDataNotice } from './ReportDataNotice';
import { REPORT_CATEGORY_STYLES } from '../constants';
import {
  REPORT_ANIMATED_ITEMS,
  REPORT_HISTORY_LOAD_MORE_THRESHOLD,
  REPORT_ITEM_STAGGER_MS,
} from '../constants/reportHistory.constant';
import { useReportFilters } from '../hooks/useReportFilters';
import { mapHistoryItemToReportItem } from '../mappers/reportHistory.mapper';
import type { HistoryReportCategory, ReportCategory, ReportItem, ReportSection } from '../types';

/** GET /results/medtech/history has no ESCALATED category — see HistoryReportCategory. */
function isHistoryEligible(category: ReportCategory): category is HistoryReportCategory {
  return category !== 'ESCALATED';
}

interface EmptyCategoryStateProps {
  category: ReportCategory;
  isOnline: boolean;
  reduceMotion: boolean;
  hasFilters: boolean;
}

function EmptyCategoryState({
  category,
  isOnline,
  reduceMotion,
  hasFilters,
}: EmptyCategoryStateProps): React.JSX.Element {
  if (hasFilters) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No matching samples</Text>
        <Text style={styles.emptySub}>
          Try another search or clear the filters to view all dates.
        </Text>
      </View>
    );
  }
  return (
    <View style={styles.empty}>
      <View style={styles.emptyArt}>
        <ReportIllustration category={category} animate={!reduceMotion} />
      </View>
      {isOnline ? (
        <>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptySub}>Samples that reach this stage will show up here.</Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>You&apos;re offline</Text>
          <Text style={styles.emptySub}>Connect to sync your finished samples.</Text>
        </>
      )}
    </View>
  );
}

function ItemSeparator(): React.JSX.Element {
  return <View style={styles.separator} />;
}

export interface CategoryDrilldownViewProps {
  category: ReportCategory;
  section: ReportSection;
  topInset: number;
  playKey: number;
  reduceMotion: boolean;
  isOnline: boolean;
  isLoading: boolean;
  hasError: boolean;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  onBack: () => void;
  onItemPress: (id: string) => void;
}

/**
 * @description One category's report list, drilled into from the Reports landing grid.
 * @param category - Which of the four report categories is open.
 * @param section - The section's title and items for this category.
 * @param topInset - Safe-area top inset, passed through to the curved header.
 * @param playKey - Bumped to replay the list's entrance animation on refocus.
 * @param reduceMotion - Disables entrance/illustration animation.
 * @param isOnline - Gates pull-to-refresh.
 * @param isLoading - Suppresses the empty state while the initial load is in flight.
 * @param hasError - Surfaces a loading or sync failure without hiding cached records.
 * @param isRefreshing - Drives the pull-to-refresh spinner.
 * @param onRefresh - Triggers a manual sync.
 * @param onBack - Returns to the category landing grid.
 * @param onItemPress - Opens a report item's sample detail.
 */
export function CategoryDrilldownView({
  category,
  section,
  topInset,
  playKey,
  reduceMotion,
  isOnline,
  isLoading,
  hasError,
  isRefreshing,
  onRefresh,
  onBack,
  onItemPress,
}: CategoryDrilldownViewProps): React.JSX.Element {
  const [historyItems, setHistoryItems] = useState<ReportItem[]>([]);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyTotal, setHistoryTotal] = useState<number | null>(null);
  // Raw count of rows the server has returned so far, including ones filtered out below
  // as already-synced duplicates — "hasMoreHistory" must track against this, not against
  // historyItems.length, or an overlap-heavy category would never reach historyTotal and
  // "Load older samples" would keep showing after every page had been fetched.
  const [rawHistoryFetched, setRawHistoryFetched] = useState(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Reset paged-in history when the category changes (a fresh mount, since ReportsScreen
  // keys this component by category) or the local section is replaced by a sync.
  useEffect(() => {
    setHistoryItems([]);
    setHistoryPage(0);
    setHistoryTotal(null);
    setRawHistoryFetched(0);
  }, [category]);

  // The server history endpoint has no notion of what's already synced to this phone, so
  // its newest-first pages re-list samples already shown in `section.data`. Skip those so
  // "Load older samples" doesn't duplicate the current view.
  const localSpecimenIds = useMemo(
    (): Set<string> =>
      new Set(
        section.data
          .map((item): string | null | undefined => item.specimenId)
          .filter((specimenId): specimenId is string => Boolean(specimenId)),
      ),
    [section.data],
  );

  const handleLoadOlder = useCallback((): void => {
    if (!isHistoryEligible(category) || isLoadingHistory) return;
    setIsLoadingHistory(true);
    const nextPage = historyPage + 1;
    reportsApi
      .getHistory(category, nextPage)
      .then((response) => {
        const newItems = response.items
          .filter((item) => !localSpecimenIds.has(item.specimenId))
          .map(mapHistoryItemToReportItem);
        setHistoryItems((prev) => [...prev, ...newItems]);
        setHistoryTotal(response.total);
        setRawHistoryFetched((prev) => prev + response.items.length);
        setHistoryPage(nextPage);
      })
      .catch((err: unknown) => console.error('[Reports] failed to load older history', err))
      .finally(() => setIsLoadingHistory(false));
  }, [category, historyPage, isLoadingHistory, localSpecimenIds]);

  const allItems = historyItems.length > 0 ? [...section.data, ...historyItems] : section.data;
  // Before the first history fetch, historyTotal is unknown — only guess there's more to
  // load when the locally-synced count already clears the threshold, instead of always
  // showing the button. Once a fetch has returned, trust the server's total instead.
  const hasMoreHistory =
    isHistoryEligible(category) &&
    (historyTotal === null
      ? section.data.length > REPORT_HISTORY_LOAD_MORE_THRESHOLD
      : rawHistoryFetched < historyTotal);
  const {
    searchQuery,
    period,
    filteredItems,
    hasFilters,
    changeSearch,
    changePeriod,
    resetFilters,
  } = useReportFilters(allItems);
  const style = REPORT_CATEGORY_STYLES[category];
  const isEmpty = filteredItems.length === 0;
  const handleKeyExtractor = useCallback((item: ReportItem): string => item.id, []);
  const handleRenderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<ReportItem>): React.JSX.Element => (
      <DropReveal
        index={index}
        playKey={playKey}
        reduceMotion={reduceMotion || index >= REPORT_ANIMATED_ITEMS}
        accent={style.color}
        radius={radius.xl}
        staggerMs={REPORT_ITEM_STAGGER_MS}
      >
        <ReportItemCard item={item} onPress={onItemPress} />
      </DropReveal>
    ),
    [playKey, reduceMotion, style.color, onItemPress],
  );
  let emptyState: React.JSX.Element | null = null;
  if (!isLoading && !hasError) {
    emptyState = (
      <EmptyCategoryState
        category={category}
        isOnline={isOnline}
        reduceMotion={reduceMotion}
        hasFilters={hasFilters}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <CategoryHeader
        category={category}
        title={section.title}
        count={section.data.length}
        topInset={topInset}
        onBack={onBack}
        playKey={playKey}
        reduceMotion={reduceMotion}
      />

      <FlatList
        data={filteredItems}
        keyExtractor={handleKeyExtractor}
        renderItem={handleRenderItem}
        ListHeaderComponent={
          <>
            <ReportDataNotice isLoading={isLoading} hasError={hasError} />
            <ReportFilters
              searchQuery={searchQuery}
              period={period}
              visibleCount={filteredItems.length}
              totalCount={section.data.length}
              hasFilters={hasFilters}
              onChangeSearch={changeSearch}
              onChangePeriod={changePeriod}
              onReset={resetFilters}
            />
          </>
        }
        ItemSeparatorComponent={ItemSeparator}
        ListFooterComponent={
          isOnline && hasMoreHistory && !isEmpty ? (
            <Pressable
              style={styles.loadOlderBtn}
              onPress={handleLoadOlder}
              disabled={isLoadingHistory}
            >
              {isLoadingHistory ? (
                <ActivityIndicator color={style.color} />
              ) : (
                <Text style={[styles.loadOlderText, { color: style.color }]}>
                  Load older samples
                </Text>
              )}
            </Pressable>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.teal}
            enabled={isOnline}
          />
        }
        contentContainerStyle={[styles.list, isEmpty && styles.listEmpty]}
        ListEmptyComponent={emptyState}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray100,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  separator: {
    height: spacing.md,
  },
  listEmpty: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxxl,
    gap: spacing.smd,
    paddingHorizontal: spacing.xxxl,
  },
  emptyArt: {
    marginBottom: spacing.sm,
    transform: [{ scale: 1.25 }],
  },
  emptyTitle: {
    ...typography.titleLg,
    color: colors.gray900,
  },
  emptySub: {
    ...typography.bodyLg,
    color: colors.gray400,
    textAlign: 'center',
  },
  loadOlderBtn: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    paddingVertical: spacing.mlg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  loadOlderText: {
    ...typography.bodyLg,
    fontWeight: fontWeight.semibold,
  },
});
