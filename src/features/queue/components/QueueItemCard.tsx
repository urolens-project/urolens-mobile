import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PulseDot } from '@components/PulseDot';
import { formatShortDateTime } from '@lib/dateTime';
import { QUEUE_STATUS_STYLES } from '../constants';
import { getQueueStatus } from '../status';
import { ITEM_HEIGHT } from '../scrollEffects';
import type { QueueItem } from '../types';

interface Props {
  item: QueueItem;
  onPress: (id: string) => void;
  selected?: boolean;
  // Lets the "in progress" dot pulse. Off for reduced motion or when the tab is out of view.
  live?: boolean;
}

// Status-based, not priority-based: priorityLevel is hardcoded to ROUTINE
// on the backend today (no code path there ever sets HIGH/NORMAL/LOW), so a
// priority badge would show the same label on every card forever — worse
// than uninformative, it implies a triage signal the system doesn't
// actually compute.
//
// Every card in the Queue carries exactly one status badge, in the same colors as the
// Status filter chips and the stats tiles (QUEUE_STATUS_STYLES). Which status a sample
// has is decided in one place (getQueueStatus) — shared with the counts, filters and
// sort — so RETURNED always wins over IN PROGRESS, which wins over ASSIGNED.
function QueueItemCardComponent({ item, onPress, selected = false, live = true }: Props) {
  const status = getQueueStatus(item);
  const style = status ? QUEUE_STATUS_STYLES[status] : null;
  const accent = style?.color ?? '#2E7D7A';

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

  return (
    <Animated.View style={wrapStyle}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(item.id)}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`Sample ${item.sampleUid}, patient ${item.patientUid}${
          style ? `, ${style.label.toLowerCase()}` : ''
        }`}
      >
        <View style={[styles.accent, { backgroundColor: accent }]} />

        {/* Brand mark — every sample is a urine specimen, so a droplet (in the
            sample's status color) marks each card. */}
        <View style={[styles.dropletBadge, { backgroundColor: style?.tint ?? '#E0F2F1' }]}>
          <Ionicons name="water" size={20} color={accent} />
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

        <View style={[styles.arrowBadge, { backgroundColor: style?.wash ?? '#EEF7F6' }]}>
          <Ionicons name="chevron-forward" size={15} color={accent} />
        </View>
      </TouchableOpacity>

      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { borderColor: accent }, ringStyle]}
      />
    </Animated.View>
  );
}

const CARD_RADIUS = 20;

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: CARD_RADIUS,
    paddingLeft: 16,
    paddingRight: 12,
    paddingVertical: 18,
    // Rows scroll-react by position (see scrollEffects), which relies on a known height.
    minHeight: ITEM_HEIGHT,
    gap: 10,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
  },
  // Slim colored edge on the left, inset from the corners.
  accent: {
    position: 'absolute',
    left: 0,
    top: 18,
    bottom: 18,
    width: 4,
    borderTopRightRadius: 2,
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
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  patientUid: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    fontVariant: ['tabular-nums'],
    marginRight: 8,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  arrowBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export const QueueItemCard = React.memo(QueueItemCardComponent);
