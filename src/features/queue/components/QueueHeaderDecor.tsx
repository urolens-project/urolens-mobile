import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '@src/theme';

// ── Header circles ───────────────────────────────────────────────────────────
// Two kinds, both moving forever with no dead time. Each starts at its own point in
// its cycle (`phase`) — so the header is already full of motion the moment it shows,
// not building up from empty — and every one runs on its own rhythm, so they never
// fall into step. All native-driver transforms and opacity.

// Big soft circles that wander in place and breathe. x / y are shares of the header's
// width / height.
const FLOATERS = [
  { x: 0.05, y: 0.2, size: 32, driftX: 16, driftY: 12, duration: 6200, phase: 0.1, alpha: 0.14 },
  { x: 0.33, y: 0.05, size: 16, driftX: 10, driftY: 14, duration: 7400, phase: 0.6, alpha: 0.22 },
  { x: 0.55, y: 0.3, size: 26, driftX: 18, driftY: 10, duration: 5600, phase: 0.35, alpha: 0.13 },
  { x: 0.8, y: 0.08, size: 13, driftX: 8, driftY: 12, duration: 6800, phase: 0.8, alpha: 0.24 },
  { x: 0.92, y: 0.36, size: 22, driftX: 12, driftY: 14, duration: 8000, phase: 0.5, alpha: 0.14 },
] as const;

// Small bubbles that rise from the bottom of the header and fade out at the top.
const RISERS = [
  { x: 0.08, size: 8, duration: 5200, phase: 0.2 },
  { x: 0.24, size: 12, duration: 6400, phase: 0.75 },
  { x: 0.42, size: 6, duration: 4800, phase: 0.45 },
  { x: 0.63, size: 10, duration: 5800, phase: 0.05 },
  { x: 0.78, size: 7, duration: 5000, phase: 0.6 },
  { x: 0.9, size: 9, duration: 6000, phase: 0.35 },
] as const;

// An endless there-and-back 0 → 1 → 0. The loop doesn't reset between rounds, so it never
// jumps, and it can start at any phase. Held still at its phase when not active.
function useOscillation(active: boolean, duration: number, phase: number): Animated.Value {
  const value = useRef(new Animated.Value(phase)).current;

  useEffect(() => {
    if (!active) {
      value.setValue(phase);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
      { resetBeforeIteration: false },
    );
    loop.start();
    return () => loop.stop();
  }, [active, duration, phase, value]);

  return value;
}

// An endless climb 0 → 1, snapping back to 0 (out of sight — it has faded to nothing by
// then) to go again.
function useClimb(active: boolean, duration: number, phase: number): Animated.Value {
  const value = useRef(new Animated.Value(phase)).current;

  useEffect(() => {
    if (!active) {
      value.setValue(phase);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(value, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
      { resetBeforeIteration: false },
    );
    loop.start();
    return () => loop.stop();
  }, [active, duration, phase, value]);

  return value;
}

function FloatingCircle({
  x,
  y,
  size,
  driftX,
  driftY,
  duration,
  phase,
  alpha,
  width,
  height,
  active,
}: (typeof FLOATERS)[number] & { width: number; height: number; active: boolean }): React.JSX.Element {
  // Sideways and vertical wander run on different periods, tracing a slow loop rather
  // than a straight back-and-forth.
  const sway = useOscillation(active, duration, phase);
  const bob = useOscillation(active, duration * 1.35, 1 - phase);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: width * x,
        top: height * y,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.white,
        opacity: bob.interpolate({ inputRange: [0, 1], outputRange: [alpha * 0.55, alpha * 1.3] }),
        transform: [
          { translateX: sway.interpolate({ inputRange: [0, 1], outputRange: [-driftX, driftX] }) },
          { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [-driftY, driftY] }) },
          { scale: bob.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) },
        ],
      }}
    />
  );
}

function RisingBubble({
  x,
  size,
  duration,
  phase,
  width,
  travel,
  bottom,
  active,
}: (typeof RISERS)[number] & {
  width: number;
  travel: number;
  bottom: number;
  active: boolean;
}): React.JSX.Element {
  const rise = useClimb(active, duration, phase);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: width * x,
        bottom,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: 'rgba(255,255,255,0.32)',
        opacity: rise.interpolate({ inputRange: [0, 0.12, 0.8, 1], outputRange: [0, 0.9, 0.5, 0] }),
        transform: [
          { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [0, -travel] }) },
          {
            translateX: rise.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 7, -5] }),
          },
        ],
      }}
    />
  );
}

export interface QueueHeaderDecorProps {
  width: number;
  height: number;
  /** Safe-area top inset — used to keep rising bubbles inside the visible header. */
  topInset: number;
  /** Whether the ambient motion should run (live tab, motion not reduced). */
  active: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * @description The Queue header's ambient decoration: drifting circles and rising
 * bubbles, the lab motif behind the brand/title content.
 * @param width - Header width, shares of which position each circle/bubble.
 * @param height - Header height.
 * @param topInset - Safe-area top inset; keeps bubbles from rising past the header.
 * @param active - Whether the ambient motion should run.
 * @param style - Fades the whole layer in/out with the header's entrance animation.
 */
export function QueueHeaderDecor({
  width,
  height,
  topInset,
  active,
  style,
}: QueueHeaderDecorProps): React.JSX.Element {
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {FLOATERS.map((circle) => (
        <FloatingCircle key={circle.x} {...circle} width={width} height={height} active={active} />
      ))}
      {RISERS.map((bubble) => (
        <RisingBubble
          key={bubble.x}
          {...bubble}
          width={width}
          travel={height - topInset - 60}
          bottom={34}
          active={active}
        />
      ))}
    </Animated.View>
  );
}
