// src/features/queue/components/QueueFilterBar.tsx
import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import type { FilterOption } from './types';
 
interface FilterChip {
  key: FilterOption;
  label: string;
}
 
const CHIPS: FilterChip[] = [
  { key: 'ALL', label: 'All' },
  { key: 'HIGH', label: 'High priority' },
  { key: 'NORMAL', label: 'Normal' },
  { key: 'ASSIGNED', label: 'Assigned' },
  { key: 'PROCESSING', label: 'Processing' },
];
 
interface Props {
  selected: FilterOption;
  onChange: (filter: FilterOption) => void;
  counts?: Partial<Record<FilterOption, number>>;
}
 
export function QueueFilterBar({ selected, onChange, counts }: Props) {
  return (
    <View style={styles.wrapper}>
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
                <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                  <Text style={[styles.countText, isActive && styles.countTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
 
const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 0,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.2)',
    backgroundColor: '#FFFFFF',
  },
  chipActive: {
    backgroundColor: '#185FA5',
    borderColor: '#185FA5',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#5F5E5A',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  countBadge: {
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  countText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#5F5E5A',
  },
  countTextActive: {
    color: '#FFFFFF',
  },
});
 
