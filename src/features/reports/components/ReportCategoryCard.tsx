import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { REPORT_CATEGORY_STYLES } from '../constants';
import type { ReportCategory } from '../types';

interface Props {
  category: ReportCategory;
  title: string;
  count: number;
  onPress: (category: ReportCategory) => void;
}

function ReportCategoryCardComponent({ category, title, count, onPress }: Props) {
  const style = REPORT_CATEGORY_STYLES[category];
  const isEmpty = count === 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(category)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${count} sample${count === 1 ? '' : 's'}`}
    >
      {/* Top accent edge — the card's "identity" stripe */}
      <View style={[styles.accent, { backgroundColor: style.color }]} />

      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={[styles.iconBadge, { backgroundColor: style.tint }]}>
            <Ionicons name={style.icon} size={18} color={style.color} />
          </View>
          <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
        </View>

        <Text
          style={[styles.count, { color: isEmpty ? '#D1D5DB' : style.color }]}
          accessibilityElementsHidden
        >
          {count}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    // Deeper "edge" than the flat list rows — these are dashboard tiles,
    // meant to read as raised, tappable landing points.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.04)',
  },
  accent: {
    height: 4,
    width: '100%',
  },
  body: {
    padding: 14,
    gap: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  count: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    lineHeight: 16,
  },
});

export const ReportCategoryCard = React.memo(ReportCategoryCardComponent);
