import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { colors, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { REPORT_CATEGORY_STYLES } from '../constants';
import { REPORT_CATEGORY_DESCRIPTIONS } from '../types';
import type { ReportCategory } from '../types';
import { ReportIllustration } from './ReportIllustration';

export interface ReportCategoryCardProps {
  category: ReportCategory;
  title: string;
  count: number;
  onPress: (category: ReportCategory) => void;
  // Idle motion on the illustration; off for reduced motion.
  animate?: boolean;
}

export const CARD_RADIUS = 24;

/**
 * @description Landing-page card for one report category: title, description, sample
 * count pill, and an animated illustration.
 * @param category - Which report category this card represents.
 * @param title - Category title.
 * @param count - Number of samples currently in this category.
 * @param onPress - Called with the category when the card is tapped.
 * @param animate - Plays idle motion on the illustration; disable for reduced motion.
 */
function ReportCategoryCardComponent({
  category,
  title,
  count,
  onPress,
  animate = true,
}: ReportCategoryCardProps): React.JSX.Element {
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
          <Text style={[styles.pillCount, { color: isEmpty ? colors.gray400 : style.color }]}>
            {count}
          </Text>
          <Text style={styles.pillLabel}>{count === 1 ? 'sample' : 'samples'}</Text>
          <Icon name="chevron-forward" size={14} color={colors.gray500} />
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
    shadowColor: colors.gray800,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  textCol: {
    flex: 1,
    paddingRight: spacing.xs,
    gap: 6,
  },
  title: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    color: colors.gray900,
  },
  description: {
    ...typography.caption,
    lineHeight: 17,
    color: colors.gray500,
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.mlg,
    paddingRight: spacing.smd,
    borderRadius: radius.xxl,
    backgroundColor: colors.white,
    shadowColor: colors.black,
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
    ...typography.body,
    fontWeight: '600',
    color: colors.gray700,
  },
  art: {
    width: 124,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const ReportCategoryCard = React.memo(ReportCategoryCardComponent);
