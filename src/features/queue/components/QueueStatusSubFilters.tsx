import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, spacing, typography, fontWeight, radius } from '@src/theme';

import { RiseIn } from '@components/RiseIn';

import { STATUS_SUB_FILTERS } from '../constants';
import type { FilterOption } from '../types';

export interface QueueStatusSubFiltersProps {
  selected: FilterOption;
  counts?: Partial<Record<FilterOption, number>>;
  onChange: (filter: FilterOption) => void;
}

/**
 * @description Sub-chip row shown when the Status group is expanded (Assigned / In
 * Progress / Returned), each in its own status color.
 * @param selected - The currently active filter.
 * @param counts - Optional per-filter counts shown as small badges.
 * @param onChange - Called with the newly selected filter.
 */
export function QueueStatusSubFilters({
  selected,
  counts,
  onChange,
}: QueueStatusSubFiltersProps): React.JSX.Element {
  return (
    <RiseIn distance={-10}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subRow}>
        {STATUS_SUB_FILTERS.map((sub) => {
          const isActive = selected === sub.key;
          return (
            <TouchableOpacity
              key={sub.key}
              style={[
                styles.subChip,
                { borderColor: sub.color },
                isActive && { backgroundColor: sub.bg },
              ]}
              onPress={() => onChange(sub.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <View style={[styles.subDot, { backgroundColor: sub.color }]} />
              <Text
                style={[
                  styles.subChipText,
                  { color: sub.color },
                  !isActive && { color: colors.gray700 },
                ]}
              >
                {sub.label}
              </Text>
              {counts?.[sub.key] !== undefined && (
                <View style={[styles.countBadge, isActive && { backgroundColor: sub.color }]}>
                  <Text style={[styles.countText, isActive && styles.countTextActive]}>
                    {counts[sub.key]}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </RiseIn>
  );
}

const styles = StyleSheet.create({
  subRow: {
    flexDirection: 'row',
    gap: 6, // TODO(theme): between spacing.xs(4)/sm(8); left exact.
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.md,
  },
  subChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5, // TODO(theme): between spacing.xs(4)/sm(8); left exact.
    paddingHorizontal: 11, // TODO(theme): between spacing.smd(10)/md(12); left exact.
    paddingVertical: spacing.sm,
    borderRadius: 18, // TODO(theme): between radius.xl(16)/xxl(20); left exact.
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
  },
  subDot: {
    width: 6,
    height: 6,
    borderRadius: 3, // Half of width/height above — computed circle radius.
  },
  subChipText: {
    ...typography.body,
    fontWeight: fontWeight.medium,
  },
  countBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs + 2, // 6 — TODO(theme): no exact token; nearest is xs(4).
    paddingVertical: 1, // TODO(theme): below spacing.xxs(2); left exact.
    minWidth: 20,
    alignItems: 'center',
    backgroundColor: colors.gray200,
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
