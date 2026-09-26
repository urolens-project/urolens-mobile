import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { formatShortDateTime } from '@lib/dateTime';
import { colors, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { REPORT_CATEGORY_STYLES } from '../constants';
import type { ReportItem } from '../types';

export interface ReportItemCardProps {
  item: ReportItem;
  onPress: (id: string) => void;
}

/**
 * @description A finished sample row, colored by the category it sits in (badge,
 * accent edge, rejection chip) so it reads as part of the container it was opened from.
 * @param item - Report item to render.
 * @param onPress - Called with the item id when the row is tapped.
 */
function ReportItemCardComponent({ item, onPress }: ReportItemCardProps): React.JSX.Element {
  const style = REPORT_CATEGORY_STYLES[item.category];

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item.id)}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Sample ${item.sampleUid}, patient ${item.patientUid}`}
    >
      <View style={[styles.accent, { backgroundColor: style.color }]} />

      <View style={[styles.dropletBadge, { backgroundColor: style.tint }]}>
        <Icon name="water" size={20} color={style.color} />
      </View>

      <View style={styles.content}>
        <Text style={styles.patientUid} numberOfLines={1}>
          {item.patientUid}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {item.sampleUid} · {item.testType ?? '—'}
        </Text>
        <View style={styles.timeRow}>
          <Icon name="time-outline" size={12} color={colors.gray400} />
          <Text style={styles.time}>{formatShortDateTime(item.finalizedAt)}</Text>
        </View>
        {item.category === 'REJECTED' && item.rejectionReason && (
          <View style={[styles.reasonChip, { backgroundColor: style.tint }]}>
            <Text style={[styles.reasonText, { color: style.color }]} numberOfLines={1}>
              {item.rejectionReason.replace(/_/g, ' ')}
            </Text>
          </View>
        )}
      </View>

      <View style={[styles.arrowBadge, { backgroundColor: style.wash }]}>
        <Icon name="chevron-forward" size={16} color={style.color} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    paddingLeft: spacing.lg,
    paddingRight: spacing.mlg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
    shadowColor: colors.gray800,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
  },
  // Slim colored edge on the left, inset from the corners.
  accent: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 4,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  dropletBadge: {
    // Radius is half of width/height to stay circular — not a scale value.
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: spacing.xxs,
  },
  patientUid: {
    ...typography.subtitle,
    fontWeight: '700',
    color: colors.gray900,
    fontVariant: ['tabular-nums'],
  },
  subtitle: {
    ...typography.body,
    color: colors.gray500,
  },
  reasonChip: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: 2,
  },
  reasonText: {
    ...typography.micro,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'capitalize',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  time: {
    ...typography.caption,
    color: colors.gray400,
    fontWeight: '500',
  },
  arrowBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const ReportItemCard = React.memo(ReportItemCardComponent);
