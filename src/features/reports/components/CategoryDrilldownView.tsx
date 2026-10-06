import { useCallback } from 'react';
import { View, FlatList, Text, RefreshControl, StyleSheet } from 'react-native';
import type { ListRenderItemInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radius, spacing, typography } from '@src/theme';

import { DropReveal } from '@components/DropReveal';

import { CategoryHeader } from './CategoryHeader';
import { ReportItemCard } from './ReportItemCard';
import { ReportIllustration } from './ReportIllustration';
import { ReportFilters } from './ReportFilters';
import { ReportDataNotice } from './ReportDataNotice';
import { REPORT_CATEGORY_STYLES } from '../constants';
import { REPORT_ANIMATED_ITEMS, REPORT_ITEM_STAGGER_MS } from '../constants/reportHistory.constant';
import { useReportFilters } from '../hooks/useReportFilters';
import type { ReportCategory, ReportItem, ReportSection } from '../types';

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
  const {
    searchQuery,
    period,
    filteredItems,
    hasFilters,
    changeSearch,
    changePeriod,
    resetFilters,
  } = useReportFilters(section.data);
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
});
