import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { REPORT_CATEGORY_STYLES } from '../constants';
import { REPORT_CATEGORY_DESCRIPTIONS } from '../types';
import type { ReportCategory } from '../types';
import { ReportIllustration } from './ReportIllustration';

interface Props {
  category: ReportCategory;
  title: string;
  count: number;
  onPress: (category: ReportCategory) => void;
  // Idle motion on the illustration; off for reduced motion.
  animate?: boolean;
}

export const CARD_RADIUS = 24;

function ReportCategoryCardComponent({ category, title, count, onPress, animate = true }: Props) {
  const style = REPORT_CATEGORY_STYLES[category];
  const isEmpty = count === 0;
  const countLabel = `${count} sample${count === 1 ? '' : 's'}`;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: style.wash }]}
      onPress={() => onPress(category)}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${countLabel}`}
    >
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={3}>
          {title}
        </Text>
        <Text style={styles.description} numberOfLines={3}>
          {REPORT_CATEGORY_DESCRIPTIONS[category]}
        </Text>

        <View style={styles.pill}>
          <Text style={[styles.pillCount, { color: isEmpty ? '#9CA3AF' : style.color }]}>
            {count}
          </Text>
          <Text style={styles.pillLabel}>{count === 1 ? 'sample' : 'samples'}</Text>
          <Ionicons name="chevron-forward" size={14} color="#6B7280" />
        </View>
      </View>

      <View style={styles.art}>
        <ReportIllustration category={category} animate={animate} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 156,
    borderRadius: CARD_RADIUS,
    paddingVertical: 18,
    paddingLeft: 20,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  textCol: {
    flex: 1,
    paddingRight: 4,
    gap: 6,
  },
  title: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
    color: '#6B7280',
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pillCount: {
    fontSize: 15,
    fontWeight: '800',
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  art: {
    width: 124,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const ReportCategoryCard = React.memo(ReportCategoryCardComponent);
