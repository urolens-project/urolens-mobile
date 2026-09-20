import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FilterOption } from '../types';

interface Props {
  isOnline: boolean;
  filter: FilterOption;
  reduceMotion: boolean;
}

// What to say when the list is empty, and the picture that goes with it. The words
// and the conditions are the Queue's original ones; only the presentation is new.
function describe({ isOnline, filter }: Pick<Props, 'isOnline' | 'filter'>) {
  if (!isOnline) {
    return {
      icon: 'cloud-offline-outline' as const,
      color: '#D97706',
      tint: '#FEF3C7',
      title: "You're offline",
      sub: 'Connect to sync your latest queue.',
    };
  }
  if (filter !== 'ALL') {
    return {
      icon: 'filter-outline' as const,
      color: '#6B7280',
      tint: '#E5E7EB',
      title: 'No matches',
      sub: 'Try selecting a different filter.',
    };
  }
  return {
    icon: 'checkmark-circle-outline' as const,
    color: '#2E7D7A',
    tint: '#E0F2F1',
    title: 'Queue is clear',
    sub: 'No samples are currently assigned to you.',
  };
}

export function QueueEmptyState({ isOnline, filter, reduceMotion }: Props) {
  const { icon, color, tint, title, sub } = describe({ isOnline, filter });

  // The icon floats gently, so an empty screen still feels alive.
  const float = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    float.setValue(0);
    if (reduceMotion) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduceMotion, float]);

  const floatStyle = {
    transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [-4, 4] }) }],
  };

  return (
    <View style={styles.empty}>
      <Animated.View style={[styles.disc, { backgroundColor: tint }, floatStyle]}>
        <View style={styles.discInner}>
          <Ionicons name={icon} size={38} color={color} />
        </View>
      </Animated.View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    paddingTop: 44,
    paddingHorizontal: 32,
    gap: 10,
  },
  disc: {
    width: 104,
    height: 104,
    borderRadius: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  discInner: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  sub: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
