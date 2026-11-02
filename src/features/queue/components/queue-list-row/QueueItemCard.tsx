import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { formatShortDateTime } from '@lib/dateTime';
import { DEFAULT_MIN_FIELDS } from '@lib/constants/fieldCapture.constant';
import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';
import { PulseDot } from '@components/PulseDot';

import { QUEUE_STATUS_STYLES } from '../../constants';
import {
  formatFieldCounterLabel,
  formatReturnReasonLabel,
  QUEUE_TEXT,
} from '../../constants/queueText.constant';
import { getQueueStatus } from '../../status';
import { ITEM_HEIGHT } from '../../scrollEffects';
import type { QueueItem } from '../../types';

export interface QueueItemCardProps {
  item: QueueItem;
  onPress: (id: string) => void;
  selected?: boolean;
  live?: boolean;
}

/**
 * @description Identifies queued work by patient code and sample, with supervisor feedback for corrections.
 * @param props - Queue entry, selection state and the selection callback.
 */
function QueueItemCardComponent({
  item,
  onPress,
  selected = false,
  live = true,
}: QueueItemCardProps): React.JSX.Element {
  const status = getQueueStatus(item);
  const statusStyle = status ? QUEUE_STATUS_STYLES[status] : null;
  const accent = statusStyle?.color ?? colors.teal;
  const isProcessing = status === 'PROCESSING';
  const isReturned = status === 'RETURNED';
  const isCapturing = status === 'CAPTURING';
  const isVerifying = status === 'VERIFYING';
  const hasReturnReason = isReturned && !!item.returnReason;
  const accessibilityLabel = `Sample ${item.sampleUid}, patient ${item.patientUid}${statusStyle ? `, ${statusStyle.label.toLowerCase()}` : ''}`;
  const handlePress = useCallback((): void => onPress(item.id), [item.id, onPress]);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isProcessing && styles.containerProcessing,
        isReturned && styles.containerReturned,
        isCapturing && styles.containerCapturing,
        isVerifying && styles.containerVerifying,
        selected && styles.containerSelected,
      ]}
      onPress={handlePress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      accessibilityHint={QUEUE_TEXT.itemCard.selectHint}
    >
      <View
        style={[
          styles.dropletBadge,
          isProcessing && styles.badgeProcessing,
          isReturned && styles.badgeReturned,
          isCapturing && styles.badgeCapturing,
          isVerifying && styles.badgeVerifying,
        ]}
      >
        <Icon name="water" size={spacing.xl} color={accent} />
      </View>
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.patientUid} numberOfLines={1}>
            {item.patientUid}
          </Text>
          {statusStyle && (
            <View
              style={[
                styles.badge,
                isProcessing && styles.badgeProcessing,
                isReturned && styles.badgeReturned,
                isCapturing && styles.badgeCapturing,
                isVerifying && styles.badgeVerifying,
              ]}
            >
              {isProcessing && <PulseDot color={accent} size={spacing.xs} live={live} />}
              <Text
                style={[
                  styles.badgeText,
                  isProcessing && styles.badgeTextProcessing,
                  isReturned && styles.badgeTextReturned,
                  isCapturing && styles.badgeTextCapturing,
                  isVerifying && styles.badgeTextVerifying,
                ]}
              >
                {statusStyle.label}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {item.sampleUid} · {formatShortDateTime(item.receivedAt)}
        </Text>
        {isReturned && (
          <Text style={styles.returnLabel}>{QUEUE_TEXT.itemCard.returnedForCorrection}</Text>
        )}
        {hasReturnReason && (
          <Text style={styles.returnReason}>{formatReturnReasonLabel(item.returnReason)}</Text>
        )}
        {isCapturing && (
          <Text style={styles.captureProgress}>
            {formatFieldCounterLabel(item.fieldCount ?? 0, DEFAULT_MIN_FIELDS)}
          </Text>
        )}
        {isVerifying && (
          <Text style={styles.verifyCaption}>{QUEUE_TEXT.itemCard.verifyOnWebsite}</Text>
        )}
      </View>
      <Icon name="chevron-forward" size={spacing.lg} color={accent} />
    </TouchableOpacity>
  );
}

/**
 * @description Memoized queue card keeps reactive totals from rerendering unchanged entries.
 * @param props - Queue card inputs.
 */
export const QueueItemCard = React.memo(QueueItemCardComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    minHeight: ITEM_HEIGHT,
    gap: spacing.smd,
    borderLeftWidth: spacing.xs,
    borderLeftColor: colors.teal,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.gray200,
  },
  containerProcessing: { borderLeftColor: colors.violet600 },
  containerReturned: { borderLeftColor: colors.amber600 },
  containerCapturing: { borderLeftColor: colors.indigo800 },
  containerVerifying: { borderLeftColor: colors.blueAlt },
  containerSelected: { backgroundColor: colors.gray50, borderWidth: spacing.xxs },
  dropletBadge: {
    width: spacing.huge,
    height: spacing.huge,
    borderRadius: radius.pill,
    backgroundColor: colors.tealTint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: { flex: 1, gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  patientUid: {
    flex: 1,
    ...typography.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.gray900,
    fontVariant: ['tabular-nums'],
  },
  subtitle: { ...typography.caption, color: colors.gray500 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm,
    backgroundColor: colors.tealTint,
  },
  badgeProcessing: { backgroundColor: colors.violet100 },
  badgeReturned: { backgroundColor: colors.amber100 },
  badgeCapturing: { backgroundColor: colors.indigo100 },
  badgeVerifying: { backgroundColor: colors.blue50 },
  badgeText: { ...typography.micro, fontWeight: fontWeight.bold, color: colors.teal },
  badgeTextProcessing: { color: colors.violet600 },
  badgeTextReturned: { color: colors.amber800 },
  badgeTextCapturing: { color: colors.indigo800 },
  badgeTextVerifying: { color: colors.blue800 },
  returnLabel: {
    ...typography.caption,
    fontWeight: fontWeight.semibold,
    color: colors.amber800,
    marginTop: spacing.xs,
  },
  returnReason: { ...typography.body, color: colors.gray700 },
  captureProgress: {
    ...typography.caption,
    fontWeight: fontWeight.semibold,
    color: colors.indigo800,
    marginTop: spacing.xs,
  },
  verifyCaption: {
    ...typography.caption,
    color: colors.blue800,
    marginTop: spacing.xs,
  },
});
