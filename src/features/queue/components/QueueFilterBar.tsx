import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';
import { RiseIn } from '@components/RiseIn';

import { DATE_SUB_FILTERS, STATUS_SUB_FILTERS } from '../constants';
import type { FilterOption } from '../types';

export interface QueueFilterBarProps {
  selected: FilterOption;
  onChange: (filter: FilterOption) => void;
  counts?: Partial<Record<FilterOption, number>>;
}

type ExpandedGroup = 'date' | 'status' | null;

/**
 * @description Filter chips for the Queue: All, plus expandable Date and Status groups
 * whose sub-chips pick the concrete filter.
 * @param selected - The currently active filter.
 * @param onChange - Called with the newly selected filter.
 * @param counts - Optional per-filter counts shown as small badges.
 */
export function QueueFilterBar({ selected, onChange, counts }: QueueFilterBarProps): React.JSX.Element {
  const isDateFilter = selected === 'LATEST' || selected === 'EARLIEST';
  const isStatusFilter =
    selected === 'ASSIGNED' || selected === 'PROCESSING' || selected === 'RETURNED';

  const [expandedGroup, setExpandedGroup] = useState<ExpandedGroup>(
    isDateFilter ? 'date' : isStatusFilter ? 'status' : null,
  );

  const handleMainChip = useCallback(
    (group: 'date' | 'all' | 'status'): void => {
      if (group === 'all') {
        onChange('ALL');
        setExpandedGroup(null);
        return;
      }
      if (group === 'date') {
        onChange('DATE');
        setExpandedGroup((prev) => (prev === 'date' ? null : 'date'));
        return;
      }
      onChange('STATUS');
      setExpandedGroup((prev) => (prev === 'status' ? null : 'status'));
    },
    [onChange],
  );

  const isAllActive = selected === 'ALL';
  const isDateActive = selected === 'DATE' || isDateFilter || expandedGroup === 'date';
  const isStatusActive = selected === 'STATUS' || isStatusFilter || expandedGroup === 'status';

  return (
    <View style={styles.wrapper}>
      {/* ── Main chips row ─────────────────────────────────────── */}
      <View style={styles.mainRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* All */}
          <TouchableOpacity
            style={[styles.chip, isAllActive && styles.chipActive]}
            onPress={() => handleMainChip('all')}
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

          {/* Date ▼ */}
          <TouchableOpacity
            style={[styles.chip, isDateActive && styles.chipActive]}
            onPress={() => handleMainChip('date')}
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

          {/* Status ▼ */}
          <TouchableOpacity
            style={[styles.chip, isStatusActive && styles.chipActive]}
            onPress={() => handleMainChip('status')}
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

      {/* ── Date sub-chips ────────────────────────────────────── */}
      {expandedGroup === 'date' && (
        <RiseIn distance={-10}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subRow}
          >
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
      )}

      {/* ── Status sub-chips ───────────────────────────────────── */}
      {expandedGroup === 'status' && (
        <RiseIn distance={-10}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subRow}
          >
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 0,
  },

  // Main row
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
  // Count badge inside main chip
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

  // Sub-chips row
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
});
