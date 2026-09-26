import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';
import { formatShortDateTime } from '@lib/dateTime';

import { QUEUE_STATUS_STYLES } from '../constants';
import { getQueueStatus } from '../status';
import type { QueueItem } from '../types';

export interface QueueActionBarProps {
  /** The selected sample, or null when nothing is selected. */
  item: QueueItem | null;
  proceedLabel: string;
  /**
   * False once the result has left the MedTech's hands (e.g. a Supervisor returned it):
   * the specimen can't be rejected any more, so the button isn't offered.
   */
  canReject?: boolean;
  onReject: () => void;
  onProceed: () => void;
  reduceMotion: boolean;
}

const SLIDE_DISTANCE = 190;

/**
 * @description The bar for the selected sample: it slides up when a sample is picked and
 * back down when it's cleared. While it slides away it keeps showing the sample it was
 * for, so the content doesn't vanish before the bar does.
 * @param item - The selected sample, or null.
 * @param proceedLabel - Label for the primary action button.
 * @param canReject - Whether the Reject button is offered.
 * @param onReject - Called when Reject is pressed.
 * @param onProceed - Called when the primary action is pressed.
 * @param reduceMotion - Skips the slide animation.
 */
export function QueueActionBar({
  item,
  proceedLabel,
  canReject = true,
  onReject,
  onProceed,
  reduceMotion,
}: QueueActionBarProps): React.JSX.Element | null {
  const [lastItem, setLastItem] = useState<QueueItem | null>(item);
  const slide = useRef(new Animated.Value(item ? 1 : 0)).current;

  useEffect(() => {
    if (item) setLastItem(item);

    if (reduceMotion) {
      slide.setValue(item ? 1 : 0);
      if (!item) setLastItem(null);
      return;
    }

    if (item) {
      Animated.spring(slide, {
        toValue: 1,
        friction: 8,
        tension: 90,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slide, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setLastItem(null);
      });
    }
  }, [item, reduceMotion, slide]);

  const shown = item ?? lastItem;
  if (!shown) return null;

  const status = getQueueStatus(shown);
  const accent = status ? QUEUE_STATUS_STYLES[status].color : colors.teal;
  const tint = status ? QUEUE_STATUS_STYLES[status].tint : colors.tealTint;

  const barStyle = {
    opacity: slide.interpolate({ inputRange: [0, 0.6], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [
      { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [SLIDE_DISTANCE, 0] }) },
    ],
  };

  return (
    <Animated.View style={[styles.bar, barStyle]} pointerEvents={item ? 'auto' : 'none'}>
      <View style={styles.grip} />

      <View style={styles.info}>
        <View style={[styles.infoIcon, { backgroundColor: tint }]}>
          <Icon name="water" size={18} color={accent} />
        </View>
        <View style={styles.infoText}>
          <Text style={styles.title} numberOfLines={1}>
            Selected: {shown.sampleUid}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {shown.patientUid} • {formatShortDateTime(shown.receivedAt)}
          </Text>
        </View>
      </View>

      <View style={styles.buttons}>
        {canReject && (
          <TouchableOpacity style={styles.rejectBtn} onPress={onReject} activeOpacity={0.8}>
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.proceedBtn} onPress={onProceed} activeOpacity={0.85}>
          <Text style={styles.proceedText}>{proceedLabel}</Text>
          <Icon name="arrow-forward" size={18} color={colors.white} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18, // TODO(theme): between spacing.lg(16)/xl(20); left exact.
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    shadowColor: colors.gray800,
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 12,
  },
  grip: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2, // TODO(theme): sub-4px decorative radius, no token this small.
    backgroundColor: colors.gray200,
    marginBottom: spacing.md,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.mlg,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20, // Half of width/height above — computed circle radius.
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
  },
  title: {
    ...typography.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.gray900,
  },
  sub: {
    ...typography.body,
    color: colors.gray500,
    marginTop: spacing.xxs,
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.smd,
  },
  rejectBtn: {
    flex: 1,
    height: 48,
    borderRadius: radius.xxxl,
    borderWidth: 1.5,
    borderColor: colors.red600,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectText: {
    ...typography.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.red600,
  },
  proceedBtn: {
    flex: 2,
    height: 48,
    borderRadius: radius.xxxl,
    backgroundColor: colors.teal,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  proceedText: {
    ...typography.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});
