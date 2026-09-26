import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';

import { HeaderWaves, LANDING_WAVES } from '@components/HeaderWaves';

import { CurvedHeaderContent } from './CurvedHeaderContent';
import { CurvedHeaderDecor } from './CurvedHeaderDecor';

// Height of the header below the status bar. The curve sits inside this, with
// the left edge of the header ending ~30px above the bottom and the right edge
// ~60px above it (see LANDING_WAVES), so content stays clear. The category
// headers (CategoryHeader) are deliberately shorter than this.
const BODY_HEIGHT = 172;

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
      <HeaderWaves
        width={width}
        height={height}
        preset={LANDING_WAVES}
        topInset={topInset}
        enter={enter}
        enterBack={enterBack}
      />

      {/* Decoration: bubbles, drops and a magnifier — the urinalysis motif. */}
      <CurvedHeaderDecor topInset={topInset} decorStyle={decorStyle} lensStyle={lensStyle} />

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
});
