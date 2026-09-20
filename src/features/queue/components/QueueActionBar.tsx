import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatShortDateTime } from '@lib/dateTime';
import { QUEUE_STATUS_STYLES } from '../constants';
import { getQueueStatus } from '../status';
import type { QueueItem } from '../types';

interface Props {
  // The selected sample, or null when nothing is selected.
  item: QueueItem | null;
  proceedLabel: string;
  onReject: () => void;
  onProceed: () => void;
  reduceMotion: boolean;
}

const SLIDE_DISTANCE = 190;

// The bar for the selected sample: it slides up when a sample is picked and back down
// when it's cleared. While it slides away it keeps showing the sample it was for, so
// the content doesn't vanish before the bar does.
export function QueueActionBar({ item, proceedLabel, onReject, onProceed, reduceMotion }: Props) {
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
  const accent = status ? QUEUE_STATUS_STYLES[status].color : '#2E7D7A';
  const tint = status ? QUEUE_STATUS_STYLES[status].tint : '#E0F2F1';

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
          <Ionicons name="water" size={18} color={accent} />
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
        <TouchableOpacity style={styles.rejectBtn} onPress={onReject} activeOpacity={0.8}>
          <Text style={styles.rejectText}>Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.proceedBtn} onPress={onProceed} activeOpacity={0.85}>
          <Text style={styles.proceedText}>{proceedLabel}</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 12,
  },
  grip: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  sub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
  },
  proceedBtn: {
    flex: 2,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2E7D7A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#2E7D7A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  proceedText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
