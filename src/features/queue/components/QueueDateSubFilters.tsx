import { ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';

import { colors, spacing, typography, fontWeight } from '@src/theme';

import { Icon } from '@components/Icon';
import { RiseIn } from '@components/RiseIn';

import { DATE_SUB_FILTERS } from '../constants';
import type { FilterOption } from '../types';

export interface QueueDateSubFiltersProps {
  selected: FilterOption;
  onChange: (filter: FilterOption) => void;
}

/**
 * @description Sub-chip row shown when the Date group is expanded (Latest / Earliest).
 * @param selected - The currently active filter.
 * @param onChange - Called with the newly selected filter.
 */
export function QueueDateSubFilters({ selected, onChange }: QueueDateSubFiltersProps): React.JSX.Element {
  return (
    <RiseIn distance={-10}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subRow}>
        {DATE_SUB_FILTERS.map((sub) => {
          const isActive = selected === sub.key;
          return (
            <TouchableOpacity
              key={sub.key}
              style={[
                styles.subChip,
                { borderColor: colors.teal },
                isActive && { backgroundColor: colors.tealTint },
              ]}
              onPress={() => onChange(sub.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <Icon name={sub.icon} size={14} color={isActive ? colors.teal : colors.gray500} />
              <Text style={[styles.subChipText, { color: isActive ? colors.teal : colors.gray700 }]}>
                {sub.label}
              </Text>
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
  subChipText: {
    ...typography.body,
    fontWeight: fontWeight.medium,
  },
});
