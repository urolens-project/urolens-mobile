import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';
import { PulseDot } from '@components/PulseDot';
import { formatShortDateTime } from '@lib/dateTime';

import { QUEUE_STATUS_STYLES } from '../constants';
import { getQueueStatus } from '../status';
import { ITEM_HEIGHT } from '../scrollEffects';
import type { QueueItem } from '../types';

export interface QueueItemCardProps {
  item: QueueItem;
  onPress: (id: string) => void;
  selected?: boolean;
  /** Lets the "in progress" dot pulse. Off for reduced motion or when the tab is out of view. */
  live?: boolean;
}

const CARD_RADIUS = radius.xxl;

/**
 * @description One row of the Queue list. Status-based, not priority-based: priorityLevel
 * is hardcoded to ROUTINE on the backend today, so a priority badge would show the same
 * label on every card forever. Every card carries exactly one status badge, in the same
 * colors as the Status filter chips and the stats tiles (QUEUE_STATUS_STYLES) — which
 * status a sample has is decided in one place (getQueueStatus), shared with the counts,
 * filters and sort, so RETURNED always wins over IN PROGRESS, which wins over ASSIGNED.
 * @param item - The queue sample to render.
 * @param onPress - Called with the sample's id when the card is tapped.
 * @param selected - Lifts the card and draws a ring in its status color.
 * @param live - Lets the "in progress" dot pulse.
 */
function QueueItemCardComponent({
  item,
  onPress,
  selected = false,
  live = true,
}: QueueItemCardProps): React.JSX.Element {
  const status = getQueueStatus(item);
  const style = status ? QUEUE_STATUS_STYLES[status] : null;
  const accent = style?.color ?? colors.teal;

  // Selecting a card lifts it slightly and draws a ring in its status color.
  const lift = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(lift, {
      toValue: selected ? 1 : 0,
      friction: 7,
      tension: 140,
      useNativeDriver: true,
    }).start();
  }, [selected, lift]);

  const wrapStyle = {
    transform: [{ scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) }],
  };
  const ringStyle = { opacity: lift };

  const handlePress = useCallback((): void => onPress(item.id), [item.id, onPress]);

  return (
    <Animated.View style={wrapStyle}>
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Sample ${item.sampleUid}, patient ${item.patientUid}${
          style ? `, ${style.label.toLowerCase()}` : ''
        }`}
      >
        <View style={[styles.accent, { backgroundColor: accent }]} />

        {/* Brand mark — every sample is a urine specimen, so a droplet (in the
            sample's status color) marks each card. */}
        <View style={[styles.dropletBadge, { backgroundColor: style?.tint ?? colors.tealTint }]}>
          <Icon name="water" size={20} color={accent} />
        </View>

        <View style={styles.content}>
          {/* Shows patientUid, not patientName: intentional privacy decision
              so PHI isn't visible on a shared queue list. */}
          <View style={styles.row}>
            <Text style={styles.patientUid} numberOfLines={1}>
              {item.patientUid}
            </Text>
            {style && (
              <View style={[styles.badge, { backgroundColor: style.tint }]}>
                {status === 'PROCESSING' && <PulseDot color={style.color} size={6} live={live} />}
                <Text style={[styles.badgeText, { color: style.badgeText }]}>{style.label}</Text>
              </View>
            )}
          </View>

          {/* Sample code and when it arrived (clinic time). Shrinks a little on
              narrow phones rather than cutting off the time. */}
          <Text
            style={styles.subtitle}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {item.sampleUid} · {formatShortDateTime(item.receivedAt)}
          </Text>
        </View>

        <View style={[styles.arrowBadge, { backgroundColor: style?.wash ?? colors.tealTint2 }]}>
          <Icon name="chevron-forward" size={15} color={accent} />
        </View>
      </TouchableOpacity>

      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { borderColor: accent }, ringStyle]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: CARD_RADIUS,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    paddingVertical: 18, // TODO(theme): 18 sits between spacing.lg(16)/xl(20); left exact to avoid nudging card height.
    // Rows scroll-react by position (see scrollEffects), which relies on a known height.
    minHeight: ITEM_HEIGHT,
    gap: spacing.smd,
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
    top: 18, // TODO(theme): paired with `bottom` below to inset from rounded corners; not a spacing token.
    bottom: 18,
    width: spacing.xs,
    borderTopRightRadius: 2, // TODO(theme): sub-4px decorative radius, no token this small.
    borderBottomRightRadius: 2,
  },
  ring: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: CARD_RADIUS,
    borderWidth: 2,
  },
  dropletBadge: {
    width: 42,
    height: 42,
    borderRadius: 21, // Exactly half of width/height above — a computed circle radius, not a design-scale value.
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 5, // TODO(theme): between spacing.xs(4)/sm(8); left exact.
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // TODO(theme): between spacing.xs(4)/sm(8); left exact.
  },
  patientUid: {
    flex: 1,
    ...typography.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.gray900,
    fontVariant: ['tabular-nums'],
    marginRight: spacing.sm,
  },
  subtitle: {
    ...typography.caption,
    color: colors.gray500,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5, // TODO(theme): between spacing.xs(4)/sm(8); left exact.
    paddingHorizontal: spacing.sm,
    paddingVertical: 3, // TODO(theme): between spacing.xxs(2)/xs(4); left exact.
    borderRadius: radius.sm,
  },
  badgeText: {
    ...typography.micro,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.3,
  },
  arrowBadge: {
    width: 26,
    height: 26,
    borderRadius: 13, // Half of width/height above — computed circle radius.
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const QueueItemCard = React.memo(QueueItemCardComponent);
