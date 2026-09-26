import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export interface PulseDotProps {
  color: string;
  size?: number;
  // Runs the pulse. Off for reduced motion, or while the screen isn't in view.
  live?: boolean;
}

/**
 * @description A small status dot with a soft ring that keeps expanding and fading —
 * the "this is live" signal. Decorative: screen readers get the text next to it.
 * @param color - Fill color of the dot and its ring.
 * @param size - Diameter in pixels. Defaults to 8.
 * @param live - Runs the pulse animation. Defaults to true.
 */
export function PulseDot({ color, size = 8, live = true }: PulseDotProps): React.JSX.Element {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulse.setValue(0);
    if (!live) return;
    const loop = Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 1700,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [live, pulse]);

  const ringStyle = {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] }) }],
  };

  return (
    <View
      style={{ width: size, height: size }}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {live && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: size / 2, backgroundColor: color },
            ringStyle,
          ]}
        />
      )}
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}
