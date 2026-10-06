import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import type { FilterOption } from '../types';

interface EmptyStateDescription {
  icon: 'cloud-offline-outline' | 'filter-outline' | 'checkmark-circle-outline';
  color: string;
  title: string;
  sub: string;
}

/**
 * @description Distinguishes missing offline data and empty filters from a completed queue.
 * @param isOnline - Whether the device currently has connectivity.
 * @param filter - The active queue filter.
 */
function describe({
  isOnline,
  filter,
}: Pick<QueueEmptyStateProps, 'isOnline' | 'filter'>): EmptyStateDescription {
  if (!isOnline) {
    return {
      icon: 'cloud-offline-outline',
      color: colors.amber600,
      title: "You're offline",
      sub: 'Connect to sync your latest queue.',
    };
  }
  if (filter !== 'ALL') {
    return {
      icon: 'filter-outline',
      color: colors.gray500,
      title: 'No matches',
      sub: 'Try selecting a different filter.',
    };
  }
  return {
    icon: 'checkmark-circle-outline',
    color: colors.teal,
    title: 'You’re all caught up',
    sub: 'No samples are currently waiting on you.',
  };
}

export interface QueueEmptyStateProps {
  isOnline: boolean;
  filter: FilterOption;
  reduceMotion: boolean;
}

/**
 * @description Empty state for the Queue list: offline, filtered-to-nothing, or genuinely
 * clear. The icon floats gently so an empty screen still feels alive.
 * @param isOnline - Whether the device currently has connectivity.
 * @param filter - The active queue filter.
 * @param reduceMotion - Disables the floating animation.
 */
export function QueueEmptyState({
  isOnline,
  filter,
  reduceMotion,
}: QueueEmptyStateProps): React.JSX.Element {
  const { icon, color, title, sub } = describe({ isOnline, filter });
  const hasFilter = filter !== 'ALL';

  const float = useRef(new Animated.Value(0)).current;
  useEffect((): (() => void) | undefined => {
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
    return (): void => loop.stop();
  }, [reduceMotion, float]);

  const floatStyle = {
    transform: [
      {
        translateY: float.interpolate({
          inputRange: [0, 1],
          outputRange: [-spacing.xs, spacing.xs],
        }),
      },
    ],
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.disc,
          hasFilter && styles.discFiltered,
          !isOnline && styles.discOffline,
          floatStyle,
        ]}
      >
        <View style={styles.discInner}>
          <Icon name={icon} size={spacing.huge} color={color} />
        </View>
      </Animated.View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.sub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingTop: spacing.huge,
    paddingHorizontal: spacing.xxxl,
    gap: spacing.smd,
  },
  disc: {
    width: spacing.jumbo * 2 + spacing.sm,
    height: spacing.jumbo * 2 + spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.tealTint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  discFiltered: { backgroundColor: colors.gray200 },
  discOffline: { backgroundColor: colors.amber100 },
  discInner: {
    width: spacing.huge + spacing.xxxl + spacing.xxs,
    height: spacing.huge + spacing.xxxl + spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: spacing.xxs },
    shadowOpacity: 0.1,
    shadowRadius: spacing.sm,
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
