import React from 'react';
import { Animated, StyleSheet, View } from 'react-native';

export const TEAL = '#2E7D7A';
export const TEAL_LIGHT = '#5FA9A5';

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

interface Props {
  width: number;
  height: number;
  preset: WavePreset;
  // Safe-area top inset, so the status-bar area is always fully covered.
  topInset: number;
  // 0 → 1 entrance progress for the front wave and (a beat behind) the back.
  enter: Animated.Value;
  enterBack: Animated.Value;
}

export function HeaderWaves({ width, height, preset, topInset, enter, enterBack }: Props) {
  const frontDiameter = width * preset.frontDiameter;
  const backDiameter = width * preset.backDiameter;

  const frontStyle = {
    transform: [
      {
        translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [preset.frontFrom, 0] }),
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
    ],
  };

  return (
    <>
      {/* Solid strip so the status-bar area is always fully covered. */}
      <View style={[styles.topFill, { height: topInset + 40 }]} />

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
