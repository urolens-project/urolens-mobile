import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import type { FilterOption } from '../features/queue/types';

const TEAL = '#2E7D7A';

interface Chip {
  key: FilterOption;
  label: string;
}

// Per SDD/SRS (STORY-MOB-05): All · High · Normal · Assigned · Processing
const CHIPS: Chip[] = [
  { key: 'ALL',        label: 'All' },
  { key: 'HIGH',       label: 'High' },
  { key: 'NORMAL',     label: 'Normal' },
  { key: 'ASSIGNED',   label: 'Assigned' },
  { key: 'PROCESSING', label: 'Processing' },
];

interface Props {
  selected: FilterOption;
  onChange: (filter: FilterOption) => void;
  counts?: Partial<Record<FilterOption, number>>;
}

export function QueueFilterBar({ selected, onChange, counts }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {CHIPS.map((chip) => {
        const isActive = selected === chip.key;
        const count = counts?.[chip.key];
        return (
          <TouchableOpacity
            key={chip.key}
            style={[styles.chip, isActive && styles.chipActive]}
            onPress={() => onChange(chip.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {chip.label}
            </Text>
            {count !== undefined && (
              <View style={[
                styles.badge,
                { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#E5E7EB' },
              ]}>
                <Text style={[
                  styles.badgeText,
                  { color: isActive ? '#FFFFFF' : '#6B7280' },
                ]}>
                  {count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: TEAL,
    borderColor: TEAL,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  badge: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
