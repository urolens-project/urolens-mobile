import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { radius as radiusTokens } from '@src/theme';

const STAGGER_MS = 170;
const FALL_MS = 360;
const SPLASH_MS = 720;
const FALL_DISTANCE = 84;
const DROP_SIZE = 16;
const RIPPLE_SIZE = 64;
// Where the drop lands, as a share of the card — over the title area, so the
// splash appears to "form" the card.
const LANDING_X = '24%';
const LANDING_Y = '42%';

/** @description Whether the OS-level "reduce motion" accessibility setting is on. */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo?.isReduceMotionEnabled?.()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return reduceMotion;
}

export interface DropRevealProps {
  // Position in the list — drives the stagger.
  index: number;
  // Changes each time the screen is entered, replaying the animation.
  playKey: number;
  reduceMotion: boolean;
  // Color of the drop and its ripple.
  accent: string;
  radius?: number;
  // Delay between consecutive items; the list screens use a tighter one.
  staggerMs?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * @description Reveals its child as a drop of liquid: a drop falls in, lands, sends
 * out a ripple, and the card springs up out of the splash. All opacity/transform
 * animations, so they run on the native driver and stay smooth.
 * @param index - Position in the list — drives the stagger delay.
 * @param playKey - Changes each time the screen is entered, replaying the animation.
 * @param reduceMotion - Skips straight to the finished state when true.
 * @param accent - Color of the drop and its ripple.
 * @param radius - Corner radius of the ripple clip, matching the card's own radius.
 * @param staggerMs - Delay between consecutive items.
 */
export function DropReveal({
  index,
  playKey,
  reduceMotion,
  accent,
  radius = radiusTokens.xxxl,
  staggerMs = STAGGER_MS,
  style,
  children,
}: DropRevealProps): React.JSX.Element {
  const fall = useRef(new Animated.Value(0)).current;
  const splash = useRef(new Animated.Value(0)).current;
  const reveal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      // Jump straight to the finished state.
      fall.setValue(1);
      splash.setValue(1);
      reveal.setValue(1);
      return;
    }

    fall.setValue(0);
    splash.setValue(0);
    reveal.setValue(0);

    const run = Animated.sequence([
      Animated.delay(index * staggerMs),
      Animated.timing(fall, {
        toValue: 1,
        duration: FALL_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(splash, {
          toValue: 1,
          duration: SPLASH_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(reveal, {
          toValue: 1,
          friction: 6,
          tension: 110,
          useNativeDriver: true,
        }),
      ]),
    ]);
    run.start();
    return () => run.stop();
  }, [playKey, reduceMotion, index, staggerMs, fall, splash, reveal]);

  const cardStyle = {
    opacity: reveal.interpolate({
      inputRange: [0, 0.3],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    transform: [
      { translateY: reveal.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) },
      { scale: reveal.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
    ],
  };

  // Stretches as it falls, flattens on impact.
  const dropStyle = {
    opacity: fall.interpolate({
      inputRange: [0, 0.12, 0.86, 1],
      outputRange: [0, 1, 1, 0],
    }),
    transform: [
      { translateY: fall.interpolate({ inputRange: [0, 1], outputRange: [-FALL_DISTANCE, 0] }) },
      { scaleY: fall.interpolate({ inputRange: [0, 1], outputRange: [1.5, 0.85] }) },
    ],
  };

  const rippleStyle = {
    opacity: splash.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] }),
    transform: [{ scale: splash.interpolate({ inputRange: [0, 1], outputRange: [0.15, 2.4] }) }],
  };

  return (
    <View style={style}>
      <Animated.View style={cardStyle}>{children}</Animated.View>

      {/* Ripple: clipped to the card's own shape so it never spills outside. */}
      <View
        style={[StyleSheet.absoluteFill, styles.rippleClip, { borderRadius: radius }]}
        pointerEvents="none"
      >
        <Animated.View style={[styles.ripple, { borderColor: accent }, rippleStyle]} />
      </View>

      {/* Drop: not clipped — it falls in from above the card. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Animated.View style={[styles.dropWrap, dropStyle]}>
          <View style={[styles.drop, { backgroundColor: accent }]} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rippleClip: {
    overflow: 'hidden',
  },
  ripple: {
    position: 'absolute',
    left: LANDING_X,
    top: LANDING_Y,
    width: RIPPLE_SIZE,
    height: RIPPLE_SIZE,
    marginLeft: -RIPPLE_SIZE / 2,
    marginTop: -RIPPLE_SIZE / 2,
    borderRadius: RIPPLE_SIZE / 2,
    borderWidth: 2,
  },
  dropWrap: {
    position: 'absolute',
    left: LANDING_X,
    top: LANDING_Y,
    width: DROP_SIZE,
    height: DROP_SIZE,
    marginLeft: -DROP_SIZE / 2,
    marginTop: -DROP_SIZE / 2,
  },
  // Teardrop: three rounded corners, sharp corner turned to point up.
  drop: {
    width: DROP_SIZE,
    height: DROP_SIZE,
    borderRadius: DROP_SIZE / 2,
    borderTopLeftRadius: 0,
    transform: [{ rotate: '45deg' }],
  },
});
