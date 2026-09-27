import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@src/theme';

/** @deprecated Import `colors.teal` from '@src/theme' directly in new code. */
export const TEAL = colors.teal;
/** @deprecated Import `colors.tealLight` from '@src/theme' directly in new code. */
export const TEAL_LIGHT = colors.tealLight;

// The curved edge is the underside of a very large circle. Its centre sits off
// to one side of the screen, so the lowest point of the header is off-centre
// and the edge climbs toward the other side — a flowing curve, not a symmetric
// arch. A lighter circle behind, offset the other way, shows as a second wave
// beneath it. (No SVG needed, so no native rebuild.)
//
// Diameters and centres are multiples of the screen width.
export interface WavePreset {
  frontDiameter: number;
  frontCenter: number;
  backDiameter: number;
  backCenter: number;
  // How far below the header's bottom edge the back circle's lowest point sits.
  backDip: number;
  // How far above their resting place the waves start before flowing down.
  frontFrom: number;
  backFrom: number;
}

// Tall, pronounced curve — the Reports landing header.
export const LANDING_WAVES: WavePreset = {
  frontDiameter: 2.3,
  frontCenter: 0.42,
  backDiameter: 2,
  backCenter: 0.78,
  backDip: 6,
  frontFrom: -70,
  backFrom: -95,
};

// The Queue's header: the Reports curve mirrored — the header is lowest right of
// centre and the lighter wave shows on the left — so the two screens read as
// relatives without being the same shape.
export const QUEUE_WAVES: WavePreset = {
  frontDiameter: 3,
  frontCenter: 0.6,
  backDiameter: 2.4,
  backCenter: 0.18,
  backDip: 6,
  frontFrom: -54,
  backFrom: -76,
};

// Flatter, shallower curve — the compact category headers.
export const COMPACT_WAVES: WavePreset = {
  frontDiameter: 3.4,
  frontCenter: 0.36,
  backDiameter: 3,
  backCenter: 0.82,
  backDip: 5,
  frontFrom: -44,
  backFrom: -62,
};

export interface HeaderWavesProps {
  width: number;
  height: number;
  preset: WavePreset;
  // Safe-area top inset, so the status-bar area is always fully covered.
  topInset: number;
  // 0 → 1 entrance progress for the front wave and (a beat behind) the back.
  enter: Animated.Value;
  enterBack: Animated.Value;
  // Keeps the waves moving forever: the two circles drift and bob on different
  // rhythms, so the curve is never quite the same shape twice. Off (the default),
  // the waves sit still once they've flowed in.
  flow?: boolean;
}

// How far each wave wanders while flowing. Sideways drift is what reshapes the curve
// (the edge is the underside of a huge circle, so sliding it moves the low point and
// tilts the slope); the vertical bob is kept small so the low point never leaves the
// header. Multiples of the width / pixels.
const FLOW = {
  front: { driftX: 0.1, bobY: 3, duration: 6800 },
  back: { driftX: 0.16, bobY: 5, duration: 8800 },
};

// One wave's endless there-and-back motion, 0 → 1 → 0 with easing at both ends. The
// loop does not reset between rounds, so it never jumps. Eases in from the resting
// midpoint first, so switching flow on doesn't snap the wave.
function useFlow(active: boolean, duration: number): Animated.Value {
  const flow = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!active) {
      flow.setValue(0.5);
      return;
    }
    const run = Animated.sequence([
      Animated.timing(flow, {
        toValue: 0,
        duration: duration / 2,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(flow, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(flow, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        { resetBeforeIteration: false },
      ),
    ]);
    run.start();
    return () => run.stop();
  }, [active, duration, flow]);

  return flow;
}

/**
 * @description Renders the two-circle "wave" curve used behind headers, entering with
 * an animated slide-in and optionally drifting/bobbing forever afterward.
 * @param width - Header width, drives the wave diameters.
 * @param height - Header height, positions the waves relative to its bottom edge.
 * @param preset - Diameter/center/timing values for a specific header shape.
 * @param topInset - Safe-area top inset so the status-bar area stays covered.
 * @param enter - 0→1 entrance progress for the front wave.
 * @param enterBack - 0→1 entrance progress for the back wave.
 * @param flow - Keeps the waves drifting/bobbing after they enter. Defaults to false.
 */
export function HeaderWaves({
  width,
  height,
  preset,
  topInset,
  enter,
  enterBack,
  flow = false,
}: HeaderWavesProps): React.JSX.Element {
  const frontDiameter = width * preset.frontDiameter;
  const backDiameter = width * preset.backDiameter;

  // The two waves move in opposite directions, so they slide across each other.
  const frontFlow = useFlow(flow, FLOW.front.duration);
  const backFlow = useFlow(flow, FLOW.back.duration);

  const frontStyle = {
    transform: [
      {
        translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [preset.frontFrom, 0] }),
      },
      {
        translateX: frontFlow.interpolate({
          inputRange: [0, 1],
          outputRange: [-width * FLOW.front.driftX, width * FLOW.front.driftX],
        }),
      },
      {
        translateY: frontFlow.interpolate({
          inputRange: [0, 1],
          outputRange: [FLOW.front.bobY, -FLOW.front.bobY],
        }),
      },
    ],
  };
  const backStyle = {
    transform: [
      {
        translateY: enterBack.interpolate({
          inputRange: [0, 1],
          outputRange: [preset.backFrom, 0],
        }),
      },
      {
        translateX: backFlow.interpolate({
          inputRange: [0, 1],
          outputRange: [width * FLOW.back.driftX, -width * FLOW.back.driftX],
        }),
      },
      {
        translateY: backFlow.interpolate({
          inputRange: [0, 1],
          outputRange: [-FLOW.back.bobY, FLOW.back.bobY],
        }),
      },
    ],
  };

  return (
    <>
      {/* Solid strip so the status-bar area is always fully covered. */}
      <View style={[styles.topFill, { height: topInset + spacing.huge }]} />

      <Animated.View
        style={[
          styles.circle,
          {
            width: backDiameter,
            height: backDiameter,
            borderRadius: backDiameter / 2,
            left: width * preset.backCenter - backDiameter / 2,
            top: height + preset.backDip - backDiameter,
            backgroundColor: TEAL_LIGHT,
          },
          backStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.circle,
          {
            width: frontDiameter,
            height: frontDiameter,
            borderRadius: frontDiameter / 2,
            left: width * preset.frontCenter - frontDiameter / 2,
            top: height - frontDiameter,
            backgroundColor: TEAL,
          },
          frontStyle,
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  topFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: TEAL,
  },
  circle: {
    position: 'absolute',
  },
});
