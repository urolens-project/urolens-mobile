import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

export interface RiseInProps {
  // Wait this long before rising, to stagger a stack of these.
  delay?: number;
  // Changes each time the screen is entered, replaying the entrance.
  playKey?: number;
  reduceMotion?: boolean;
  distance?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

/**
 * @description Fades in while springing up a short way. For blocks that aren't list
 * rows (rows use DropReveal); reduced motion shows them in place.
 * @param delay - Milliseconds to wait before rising, to stagger a stack of these.
 * @param playKey - Changes each time the screen is entered, replaying the entrance.
 * @param reduceMotion - Skips straight to the finished state when true.
 * @param distance - Pixels risen from, defaults to 18.
 */
export function RiseIn({
  delay = 0,
  playKey = 0,
  reduceMotion = false,
  distance = 18,
  style,
  children,
}: RiseInProps): React.JSX.Element {
  const rise = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      rise.setValue(1);
      return;
    }
    rise.setValue(0);
    const run = Animated.sequence([
      Animated.delay(delay),
      Animated.spring(rise, { toValue: 1, friction: 8, tension: 70, useNativeDriver: true }),
    ]);
    run.start();
    return () => run.stop();
  }, [playKey, delay, reduceMotion, rise]);

  const animated = {
    opacity: rise.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [
      { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) },
    ],
  };

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
