import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';

import { HeaderWaves, QUEUE_WAVES } from '@components/HeaderWaves';
import { Icon } from '@components/Icon';

import { QueueHeaderBody } from './QueueHeaderBody';
import { QueueHeaderDecor } from './QueueHeaderDecor';

// A little taller than the Reports landing header (172): the waves here move all the
// time, sliding the curve up toward the text at its extremes, so the text needs the room.
export const QUEUE_HEADER_BODY_HEIGHT = 188;

export interface QueueHeaderProps {
  username: string | null;
  activeCount: number;
  /** Today's date at the clinic, already formatted. */
  dateLabel: string;
  /** Safe-area top inset — the header draws under the status bar. */
  topInset: number;
  /** Changes each time the screen is entered, replaying the entrance. */
  playKey: number;
  reduceMotion: boolean;
  /** Ambient motion (rising bubbles) runs only while the tab is in view. */
  live: boolean;
  syncing: boolean;
  syncDisabled: boolean;
  onSync: () => void;
}

/**
 * @description The Queue landing header: animated wave background, drifting decoration,
 * brand row, title and active-sample count, and the sync/notifications actions.
 * @param username - Signed-in medtech's display name, if known.
 * @param activeCount - Number of samples currently active in the queue.
 * @param dateLabel - Today's date at the clinic, already formatted.
 * @param topInset - Safe-area top inset; the header draws under the status bar.
 * @param playKey - Changes each time the screen is entered, replaying the entrance.
 * @param reduceMotion - Disables all animation.
 * @param live - Whether ambient motion (rising bubbles) should run.
 * @param syncing - Whether a sync is currently in progress.
 * @param syncDisabled - Disables the sync button.
 * @param onSync - Called when the sync button is pressed.
 */
export function QueueHeader({
  username,
  activeCount,
  dateLabel,
  topInset,
  playKey,
  reduceMotion,
  live,
  syncing,
  syncDisabled,
  onSync,
}: QueueHeaderProps): React.JSX.Element {
  const { width } = useWindowDimensions();
  const height = topInset + QUEUE_HEADER_BODY_HEIGHT;
  // Everything that moves on its own runs only while the tab is in view and motion is allowed.
  const animate = live && !reduceMotion;

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

    // The waves flow down (the back one a beat behind), then the microscope settles.
    const run = Animated.parallel([
      Animated.spring(enter, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(110),
        Animated.spring(enterBack, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(300),
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
      { rotate: lens.interpolate({ inputRange: [0, 1], outputRange: ['12deg', '0deg'] }) },
      { scale: lens.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
    ],
  };

  return (
    <View style={[styles.wrap, { width, height }]}>
      <HeaderWaves
        width={width}
        height={height}
        preset={QUEUE_WAVES}
        topInset={topInset}
        enter={enter}
        enterBack={enterBack}
        flow={animate}
      />

      {/* Decoration: drifting circles, rising bubbles and a faint microscope — the lab motif. */}
      <QueueHeaderDecor width={width} height={height} topInset={topInset} active={animate} style={decorStyle} />
      <Animated.View
        style={[styles.microscope, { top: topInset + 62 }, lensStyle]}
        pointerEvents="none"
      >
        <Icon family="material-community" name="microscope" size={96} color="rgba(255,255,255,0.16)" />
      </Animated.View>

      <QueueHeaderBody
        username={username}
        activeCount={activeCount}
        dateLabel={dateLabel}
        topInset={topInset}
        style={contentStyle}
        syncing={syncing}
        syncDisabled={syncDisabled}
        reduceMotion={reduceMotion}
        onSync={onSync}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  microscope: {
    position: 'absolute',
    right: 14,
  },
});
