import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import type { FilterOption } from '../types';

export interface QueueFilterMainChipsProps {
  selected: FilterOption;
  counts?: Partial<Record<FilterOption, number>>;
  isDateActive: boolean;
  isStatusActive: boolean;
  expandedGroup: 'date' | 'status' | null;
  onMainChip: (group: 'date' | 'all' | 'status') => void;
}

/**
 * @description The "All / Date ▼ / Status ▼" chip row at the top of the Queue filter bar.
 * @param selected - The currently active filter.
 * @param counts - Optional per-filter counts shown as small badges.
 * @param isDateActive - Whether the Date chip should render active.
 * @param isStatusActive - Whether the Status chip should render active.
 * @param expandedGroup - Which sub-chip group is expanded, for the chevron direction.
 * @param onMainChip - Called when a main chip is tapped.
 */
export function QueueFilterMainChips({
  selected,
  counts,
  isDateActive,
  isStatusActive,
  expandedGroup,
  onMainChip,
}: QueueFilterMainChipsProps): React.JSX.Element {
  const isAllActive = selected === 'ALL';

  return (
    <View style={styles.mainRow}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          style={[styles.chip, isAllActive && styles.chipActive]}
          onPress={() => onMainChip('all')}
          accessibilityRole="button"
          accessibilityState={{ selected: isAllActive }}
        >
          <Text style={[styles.chipText, isAllActive && styles.chipTextActive]}>All</Text>
          {counts?.ALL !== undefined && (
            <View style={[styles.countBadge, isAllActive && styles.countBadgeActive]}>
              <Text style={[styles.countText, isAllActive && styles.countTextActive]}>
                {counts.ALL}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, isDateActive && styles.chipActive]}
          onPress={() => onMainChip('date')}
          accessibilityRole="button"
          accessibilityState={{ selected: isDateActive }}
        >
          <Icon name="calendar-outline" size={14} color={isDateActive ? colors.white : colors.gray500} />
          <Text style={[styles.chipText, isDateActive && styles.chipTextActive]}>Date</Text>
          <Icon
            name={expandedGroup === 'date' ? 'chevron-up' : 'chevron-down'}
            size={13}
            color={isDateActive ? colors.white : colors.gray500}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, isStatusActive && styles.chipActive]}
          onPress={() => onMainChip('status')}
          accessibilityRole="button"
          accessibilityState={{ selected: isStatusActive }}
        >
          <Text style={[styles.chipText, isStatusActive && styles.chipTextActive]}>Status</Text>
          <Icon
            name={expandedGroup === 'status' ? 'chevron-up' : 'chevron-down'}
            size={13}
            color={isStatusActive ? colors.white : colors.gray500}
          />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollContent: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // TODO(theme): between spacing.xs(4)/sm(8); left exact.
    paddingHorizontal: spacing.lg,
    paddingVertical: 9, // TODO(theme): between spacing.sm(8)/smd(10); left exact.
    borderRadius: 22, // TODO(theme): between radius.xxl(20)/xxxl(24); left exact.
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.gray200,
    shadowColor: colors.gray800,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 1,
  },
  chipActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
    shadowColor: colors.teal,
    shadowOpacity: 0.3,
    shadowRadius: 7,
    elevation: 3,
  },
  chipText: {
    ...typography.body,
    fontWeight: fontWeight.medium,
    color: colors.gray700,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: fontWeight.semibold,
  },
  countBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs + 2, // 6 — TODO(theme): no exact token; nearest is xs(4).
    paddingVertical: 1, // TODO(theme): below spacing.xxs(2); left exact.
    minWidth: 20,
    alignItems: 'center',
    backgroundColor: colors.gray200,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  countText: {
    ...typography.micro,
    fontWeight: fontWeight.bold,
    color: colors.gray500,
  },
  countTextActive: {
    color: colors.white,
  },
});
