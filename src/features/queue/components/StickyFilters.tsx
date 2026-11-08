import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';

import { colors, spacing } from '@src/theme';

export interface StickyFiltersProps {
  scrollY: Animated.Value;
  /**
   * Where the filters rest before any scrolling (list coordinates). Scrolling this far is
   * when they reach the top; from then on they stay put while the list moves under them.
   */
  restY: number;
  /** Reports the bar's height (it grows when a filter row opens) so the list can leave room. */
  onHeight: (height: number) => void;
  children: React.ReactNode;
}

/**
 * @description The filter bar, pinned. It's laid over the list rather than inside it, and
 * follows the scroll up until it reaches the top, then holds there — the rows roll away
 * underneath. Opaque, so nothing shows through it.
 * @param scrollY - The list's scroll position.
 * @param restY - Where the bar rests before scrolling.
 * @param onHeight - Called with the bar's measured height.
 * @param children - The filter chips to render inside the pinned bar.
 */
export function StickyFilters({ scrollY, restY, onHeight, children }: StickyFiltersProps): React.JSX.Element {
  const rest = Math.max(restY, 1);

  // Follows the list on the way up (and when pulled down past the top); clamps once pinned.
  const translateY = scrollY.interpolate({
    inputRange: [0, rest],
    outputRange: [rest, 0],
    extrapolateLeft: 'extend',
    extrapolateRight: 'clamp',
  });

  // A soft edge fades in as the bar pins, to separate it from the rows passing beneath.
  const edgeOpacity = scrollY.interpolate({
    inputRange: [Math.max(rest - 14, 0), rest],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[styles.bar, { transform: [{ translateY }] }]}
      onLayout={(e: LayoutChangeEvent) => onHeight(e.nativeEvent.layout.height)}
    >
      <View style={styles.inner}>{children}</View>
      <Animated.View pointerEvents="none" style={[styles.edge, { opacity: edgeOpacity }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
    backgroundColor: colors.gray100,
  },
  inner: {
    paddingHorizontal: spacing.lg,
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: 'rgba(31,41,55,0.08)',
    shadowColor: colors.gray800,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
});
