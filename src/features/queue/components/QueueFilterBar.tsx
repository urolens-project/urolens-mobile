import React, { useState } from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FilterOption } from '../types';

const TEAL = '#2E7D7A';

interface Props {
  selected: FilterOption;
  onChange: (filter: FilterOption) => void;
  counts?: Partial<Record<FilterOption, number>>;
}

type ExpandedGroup = 'date' | 'status' | null;

export function QueueFilterBar({ selected, onChange, counts }: Props) {
  const isDateFilter = selected === 'LATEST' || selected === 'EARLIEST';
  const isStatusFilter =
    selected === 'ASSIGNED' || selected === 'PROCESSING' || selected === 'RETURNED';

  const [expandedGroup, setExpandedGroup] = useState<ExpandedGroup>(
    isDateFilter ? 'date' : isStatusFilter ? 'status' : null,
  );

  function handleMainChip(group: 'date' | 'all' | 'status') {
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
    if (group === 'status') {
      onChange('STATUS');
      setExpandedGroup((prev) => (prev === 'status' ? null : 'status'));
      return;
    }
  }

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
            <Ionicons
              name="calendar-outline"
              size={14}
              color={isDateActive ? '#FFFFFF' : '#6B7280'}
            />
            <Text style={[styles.chipText, isDateActive && styles.chipTextActive]}>Date</Text>
            <Ionicons
              name={expandedGroup === 'date' ? 'chevron-up' : 'chevron-down'}
              size={13}
              color={isDateActive ? '#FFFFFF' : '#6B7280'}
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
            <Ionicons
              name={expandedGroup === 'status' ? 'chevron-up' : 'chevron-down'}
              size={13}
              color={isStatusActive ? '#FFFFFF' : '#6B7280'}
            />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ── Date sub-chips ────────────────────────────────────── */}
      {expandedGroup === 'date' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subRow}
        >
          {(
            [
              { key: 'LATEST' as FilterOption, label: 'Latest', icon: 'arrow-down-outline' },
              { key: 'EARLIEST' as FilterOption, label: 'Earliest', icon: 'arrow-up-outline' },
            ] as const
          ).map((sub) => {
            const isActive = selected === sub.key;
            return (
              <TouchableOpacity
                key={sub.key}
                style={[
                  styles.subChip,
                  { borderColor: TEAL },
                  isActive && { backgroundColor: '#E0F2F1' },
                ]}
                onPress={() => onChange(sub.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Ionicons name={sub.icon as any} size={14} color={isActive ? TEAL : '#6B7280'} />
                <Text style={[styles.subChipText, { color: isActive ? TEAL : '#374151' }]}>
                  {sub.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* ── Status sub-chips ───────────────────────────────────── */}
      {expandedGroup === 'status' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subRow}
        >
          {(
            [
              { key: 'ASSIGNED' as FilterOption, label: 'Assigned', color: TEAL, bg: '#E0F2F1' },
              {
                key: 'PROCESSING' as FilterOption,
                label: 'Processing',
                color: '#7C3AED',
                bg: '#EDE9FE',
              },
              {
                key: 'RETURNED' as FilterOption,
                label: 'Returned',
                color: '#D97706',
                bg: '#FEF3C7',
              },
            ] as const
          ).map((sub) => {
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
                    !isActive && { color: '#374151' },
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
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Count badge inside main chip
  countBadge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  countTextActive: {
    color: '#FFFFFF',
  },

  // Sub-chips row
  subRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  subChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  subDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
