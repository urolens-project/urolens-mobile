import { View, ScrollView, Text, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';
import { DropReveal } from '@components/DropReveal';

import { CurvedHeader } from './CurvedHeader';
import { CARD_RADIUS, ReportCategoryCard } from './ReportCategoryCard';
import { REPORT_CATEGORY_STYLES } from '../constants';
import type { ReportCategory, ReportSection } from '../types';

export interface ReportsLandingViewProps {
  username: string | null;
  totalCount: number;
  topInset: number;
  playKey: number;
  reduceMotion: boolean;
  sections: ReportSection[];
  isOnline: boolean;
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  onSelectCategory: (category: ReportCategory) => void;
}

/**
 * @description Reports landing grid: one card per category, each showing its item count.
 * @param username - Shown in the curved header greeting.
 * @param totalCount - Total items across all categories, shown in the header.
 * @param topInset - Safe-area top inset, passed through to the curved header.
 * @param playKey - Bumped to replay the cards' entrance animation on refocus.
 * @param reduceMotion - Disables entrance animation.
 * @param sections - The four report categories with their items.
 * @param isOnline - Gates pull-to-refresh and shows the offline note.
 * @param isRefreshing - Drives the pull-to-refresh spinner.
 * @param onRefresh - Triggers a manual sync.
 * @param onSelectCategory - Drills into a category's list.
 */
export function ReportsLandingView({
  username,
  totalCount,
  topInset,
  playKey,
  reduceMotion,
  sections,
  isOnline,
  isRefreshing,
  onRefresh,
  onSelectCategory,
}: ReportsLandingViewProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <CurvedHeader
        username={username}
        totalCount={totalCount}
        topInset={topInset}
        playKey={playKey}
        reduceMotion={reduceMotion}
      />

      <ScrollView
        contentContainerStyle={styles.categoryScroll}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.teal}
            enabled={isOnline}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.categoryList}>
          {sections.map((section, index) => (
            <DropReveal
              key={section.category}
              index={index}
              playKey={playKey}
              reduceMotion={reduceMotion}
              accent={REPORT_CATEGORY_STYLES[section.category].color}
              radius={CARD_RADIUS}
            >
              <ReportCategoryCard
                category={section.category}
                title={section.title}
                count={section.data.length}
                onPress={onSelectCategory}
                animate={!reduceMotion}
              />
            </DropReveal>
          ))}
        </View>

        {!isOnline && (
          <View style={styles.offlineNote}>
            <Icon name="cloud-offline-outline" size={16} color={colors.amber800} />
            <Text style={styles.offlineNoteText}>Offline — showing cached data</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.gray100,
  },
  categoryScroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.mlg,
    paddingBottom: spacing.xxxl,
  },
  categoryList: {
    flexDirection: 'column',
    gap: spacing.mlg,
  },
  offlineNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'center',
    backgroundColor: colors.amber100,
    borderWidth: 1,
    borderColor: colors.amber200,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xxl,
    marginTop: spacing.xl,
  },
  offlineNoteText: {
    ...typography.caption,
    fontWeight: fontWeight.semibold,
    color: colors.amber800,
  },
});
