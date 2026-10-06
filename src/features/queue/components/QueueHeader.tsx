import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';

import { colors, spacing } from '@src/theme';

import { HeaderWaves, QUEUE_WAVES } from '@components/HeaderWaves';
import { Icon } from '@components/Icon';

import { QueueHeaderBody } from './QueueHeaderBody';
import { QueueHeaderDecor } from './QueueHeaderDecor';

// Minimum body height; the content can grow with the device's text-size setting.
export const QUEUE_HEADER_BODY_HEIGHT = spacing.jumbo * 2 + spacing.lg;

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
  /** Entrance and wave motion run only while the tab is in view. */
  live: boolean;
  syncing: boolean;
  syncDisabled: boolean;
  onSync: () => void;
}

/**
 * @description Uses the Reports curved background in a compact queue header,
 * keeping the sample list as the main focus.
 * @param username - Signed-in medtech's display name, if known.
 * @param activeCount - Number of samples currently active in the queue.
 * @param dateLabel - Today's date at the clinic, already formatted.
 * @param topInset - Safe-area top inset; the header draws under the status bar.
 * @param playKey - Changes each time the screen is entered, replaying the entrance.
 * @param reduceMotion - Disables all animation.
 * @param live - Whether the tab is currently in view.
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
  const [headerHeight, setHeaderHeight] = useState(topInset + QUEUE_HEADER_BODY_HEIGHT);
  // Keep the curved edge inside the existing bottom padding, including on wider screens.
  const waveCurveScale = Math.min(1, (spacing.sm * 4) / width);
  const enter = useRef(new Animated.Value(1)).current;
  const waveEnter = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion || !live) {
      enter.setValue(1);
      return;
    }

    enter.setValue(0);
    const animation = Animated.timing(enter, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    });
    animation.start();
    return (): void => animation.stop();
  }, [playKey, reduceMotion, live, enter]);

  const handleLayout = useCallback((event: LayoutChangeEvent): void => {
    setHeaderHeight(event.nativeEvent.layout.height);
  }, []);

  const contentStyle = {
    opacity: enter,
    transform: [
      {
        translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [spacing.xs, 0] }),
      },
    ],
  };

  return (
    <View
      style={[styles.container, { minHeight: topInset + QUEUE_HEADER_BODY_HEIGHT }]}
      onLayout={handleLayout}
    >
      <View
        style={styles.waves}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={[styles.headerFill, { height: Math.max(0, headerHeight - spacing.xxxl) }]} />
        <HeaderWaves
          width={width}
          height={headerHeight - spacing.sm}
          preset={QUEUE_WAVES}
          topInset={topInset}
          enter={waveEnter}
          enterBack={waveEnter}
          flow={live && !reduceMotion}
          flowScale={0.5}
          curveScale={waveCurveScale}
        />
      </View>
      <View
        style={[styles.decoration, { top: topInset }]}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <QueueHeaderDecor
          width={width}
          height={headerHeight - topInset}
          topInset={0}
          active={false}
          scale={0.5}
          style={styles.bubbles}
        />
        <View style={styles.microscope}>
          <Icon
            family="material-community"
            name="microscope"
            size={spacing.jumbo}
            color={colors.white}
          />
        </View>
      </View>
      <QueueHeaderBody
        username={username}
        activeCount={activeCount}
        dateLabel={dateLabel}
        topInset={topInset}
        style={contentStyle}
        syncing={syncing}
        syncDisabled={syncDisabled}
        reduceMotion={reduceMotion || !live}
        onSync={onSync}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  waves: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  headerFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.teal,
  },
  decoration: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bubbles: {
    opacity: 0.4,
  },
  microscope: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.lg,
    opacity: 0.08,
  },
});
