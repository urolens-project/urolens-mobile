import { View, FlatList, Text, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@src/theme';

import { DropReveal } from '@components/DropReveal';

import { CategoryHeader } from './CategoryHeader';
import { ReportItemCard } from './ReportItemCard';
import { ReportIllustration } from './ReportIllustration';
import { REPORT_CATEGORY_STYLES } from '../constants';
import type { ReportCategory, ReportSection } from '../types';

// Number of list items that get the drop-in entrance; anything further down
// is just shown, so scrolling a long list never re-triggers animation.
const ANIMATED_ITEMS = 8;
const ITEM_STAGGER_MS = 90;

interface EmptyCategoryStateProps {
  category: ReportCategory;
  isOnline: boolean;
  reduceMotion: boolean;
}

function EmptyCategoryState({
  category,
  isOnline,
  reduceMotion,
}: EmptyCategoryStateProps): React.JSX.Element {
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
  isRefreshing,
  onRefresh,
  onBack,
  onItemPress,
}: CategoryDrilldownViewProps): React.JSX.Element {
  const style = REPORT_CATEGORY_STYLES[category];

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
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
        data={section.data}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <DropReveal
            index={index}
            playKey={playKey}
            reduceMotion={reduceMotion || index >= ANIMATED_ITEMS}
            accent={style.color}
            radius={18}
            staggerMs={ITEM_STAGGER_MS}
          >
            <ReportItemCard item={item} onPress={onItemPress} />
          </DropReveal>
        )}
        ItemSeparatorComponent={ItemSeparator}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.teal}
            enabled={isOnline}
          />
        }
        contentContainerStyle={[styles.list, section.data.length === 0 && styles.listEmpty]}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyCategoryState category={category} isOnline={isOnline} reduceMotion={reduceMotion} />
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
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
