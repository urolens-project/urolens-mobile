import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import type { FilterOption } from '../types';

export interface QueueEmptyStateProps {
  isOnline: boolean;
  filter: FilterOption;
  reduceMotion: boolean;
}

interface EmptyStateDescription {
  icon: 'cloud-offline-outline' | 'filter-outline' | 'checkmark-circle-outline';
  color: string;
  tint: string;
  title: string;
  sub: string;
}

/**
 * @description What to say when the list is empty, and the picture that goes with it. The
 * words and the conditions are the Queue's original ones; only the presentation is new.
 * @param isOnline - Whether the device currently has connectivity.
 * @param filter - The active queue filter.
 */
function describe({ isOnline, filter }: Pick<QueueEmptyStateProps, 'isOnline' | 'filter'>): EmptyStateDescription {
  if (!isOnline) {
    return {
      icon: 'cloud-offline-outline',
      color: colors.amber600,
      tint: colors.amber100,
      title: "You're offline",
      sub: 'Connect to sync your latest queue.',
    };
  }
  if (filter !== 'ALL') {
    return {
      icon: 'filter-outline',
      color: colors.gray500,
      tint: colors.gray200,
      title: 'No matches',
      sub: 'Try selecting a different filter.',
    };
  }
  return {
    icon: 'checkmark-circle-outline',
    color: colors.teal,
    tint: colors.tealTint,
    title: 'Queue is clear',
    sub: 'No samples are currently assigned to you.',
  };
}

/**
 * @description Empty state for the Queue list: offline, filtered-to-nothing, or genuinely
 * clear. The icon floats gently so an empty screen still feels alive.
 * @param isOnline - Whether the device currently has connectivity.
 * @param filter - The active queue filter.
 * @param reduceMotion - Disables the floating animation.
 */
export function QueueEmptyState({ isOnline, filter, reduceMotion }: QueueEmptyStateProps): React.JSX.Element {
  const { icon, color, tint, title, sub } = describe({ isOnline, filter });

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
          <Icon name={icon} size={38} color={color} />
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
    paddingTop: 44, // TODO(theme): between spacing.xxxl(32)/huge(40); left exact.
    paddingHorizontal: spacing.xxxl,
    gap: spacing.smd,
  },
  disc: {
    width: 104,
    height: 104,
    borderRadius: 52, // Half of width/height above — computed circle radius.
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6, // TODO(theme): between spacing.xs(4)/sm(8); left exact.
  },
  discInner: {
    width: 74,
    height: 74,
    borderRadius: 37, // Half of width/height above — computed circle radius.
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    ...typography.titleLg,
    fontWeight: fontWeight.bold,
    color: colors.gray900,
  },
  sub: {
    ...typography.bodyLg,
    color: colors.gray400,
    textAlign: 'center',
  },
});
