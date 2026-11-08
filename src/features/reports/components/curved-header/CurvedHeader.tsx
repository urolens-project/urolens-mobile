import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';

import { colors, spacing } from '@src/theme';

import { HeaderWaves, QUEUE_WAVES } from '@components/HeaderWaves';

import { CurvedHeaderContent } from './CurvedHeaderContent';
import { CurvedHeaderDecor } from './CurvedHeaderDecor';

// Height of the header below the status bar, matching Queue's compact formula so the
// two tabs carry the same visual weight.
const BODY_HEIGHT = spacing.jumbo * 2 + spacing.lg;

// Shrinks the bubbles/drops/magnifier to match the now-flatter wave.
const DECOR_SCALE = 0.55;

export interface CurvedHeaderProps {
  username: string | null;
  totalCount: number;
  // Safe-area top inset — the header draws under the status bar.
  topInset: number;
  // Changes each time the screen is entered, replaying the entrance.
  playKey: number;
  reduceMotion: boolean;
}

/**
 * @description Animated landing header for the Reports screen: greets the medtech by
 * name, shows a lifetime total, and plays a wave/magnifier entrance animation.
 * @param username - Current medtech's display name; falls back to "MedTech".
 * @param totalCount - Lifetime count of finished samples, shown in the total badge.
 * @param topInset - Safe-area top inset the header draws under.
 * @param playKey - Changes each time the screen is entered, replaying the entrance animation.
 * @param reduceMotion - Skips the entrance animation when true.
 */
export function CurvedHeader({
  username,
  totalCount,
  topInset,
  playKey,
  reduceMotion,
}: CurvedHeaderProps): React.JSX.Element {
  const { width } = useWindowDimensions();
  const height = topInset + BODY_HEIGHT;
  // Keep the curved edge inside the compact body, including on wider screens.
  const waveCurveScale = Math.min(1, (spacing.sm * 4) / width);

  const enter = useRef(new Animated.Value(0)).current;
  const enterBack = useRef(new Animated.Value(0)).current;
  const lens = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      enter.setValue(1);
      enterBack.setValue(1);
      lens.setValue(1);
      return;
    }

    enter.setValue(0);
    enterBack.setValue(0);
    lens.setValue(0);

    // The waves flow down from the top, the back one a beat behind; then the
    // magnifier swings into focus.
    const run = Animated.parallel([
      Animated.spring(enter, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(110),
        Animated.spring(enterBack, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(320),
        Animated.spring(lens, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
      ]),
    ]);
    run.start();
    return () => run.stop();
  }, [playKey, reduceMotion, enter, enterBack, lens]);

  const contentStyle = {
    opacity: enter.interpolate({
      inputRange: [0.35, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  };
  const decorStyle = {
    opacity: enter.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
  };
  const lensStyle = {
    opacity: lens.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [
      { rotate: lens.interpolate({ inputRange: [0, 1], outputRange: ['-35deg', '0deg'] }) },
      { scale: lens.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
    ],
  };

  return (
    <View style={[styles.wrap, { width, height }]}>
      {/* Solid fill behind the flattened wave, so no gap shows above its curve. */}
      <View style={[styles.fill, { height: Math.max(0, height - spacing.xxxl) }]} />
      <HeaderWaves
        width={width}
        height={height - spacing.sm}
        preset={QUEUE_WAVES}
        topInset={topInset}
        enter={enter}
        enterBack={enterBack}
        curveScale={waveCurveScale}
      />

      {/* Decoration: bubbles, drops and a magnifier — the urinalysis motif. */}
      <CurvedHeaderDecor
        topInset={topInset}
        decorStyle={decorStyle}
        lensStyle={lensStyle}
        scale={DECOR_SCALE}
      />

      <CurvedHeaderContent
        username={username}
        totalCount={totalCount}
        topInset={topInset}
        contentStyle={contentStyle}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.teal,
  },
});
