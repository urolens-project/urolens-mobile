import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { colors, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { REPORT_CATEGORY_STYLES } from '../../constants';
import { REPORTS_TEXT } from '../../constants/reportsText.constant';
import { REPORT_CATEGORY_DESCRIPTIONS } from '../../types';
import type { ReportCategory } from '../../types';
import { ILLUSTRATION_SIZE, ReportIllustration } from '../report-illustration';

export interface ReportCategoryCardProps {
  category: ReportCategory;
  title: string;
  count: number;
  onPress: (category: ReportCategory) => void;
  // Idle motion on the illustration; off for reduced motion.
  animate?: boolean;
}

export const CARD_RADIUS = 20;

// Shrinks the illustration to match the card's smaller footprint, without touching its
// internal fixed-pixel scene geometry (illustrationParts.tsx / illustrationScenes.tsx).
const ART_SCALE = 0.8;
const ART_SIZE = ILLUSTRATION_SIZE * ART_SCALE;

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
  const countLabel = REPORTS_TEXT.getSampleCountLabel(count);

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
          <Text style={styles.pillLabel}>{REPORTS_TEXT.getSampleUnitLabel(count)}</Text>
          <Icon name="chevron-forward" size={14} color={colors.gray500} />
        </View>
      </View>

      <View style={styles.art}>
        <View style={styles.artScale}>
          <ReportIllustration category={category} animate={animate} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minHeight: 132,
    borderRadius: CARD_RADIUS,
    paddingVertical: spacing.mlg,
    paddingLeft: spacing.lg,
    paddingRight: spacing.smd,
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
    ...typography.titleLg,
    fontWeight: '700',
    color: colors.gray900,
  },
  description: {
    ...typography.caption,
    lineHeight: 16,
    color: colors.gray500,
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: radius.xxl,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  pillCount: {
    ...typography.subtitle,
    fontWeight: '800',
  },
  pillLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.gray700,
  },
  art: {
    width: ART_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artScale: {
    transform: [{ scale: ART_SCALE }],
  },
});

export const ReportCategoryCard = React.memo(ReportCategoryCardComponent);
