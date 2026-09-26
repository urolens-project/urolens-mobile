import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { getInitials } from '@lib/auth/getInitials';
import { colors, spacing } from '@src/theme';

import { HeaderWaves, LANDING_WAVES, TEAL } from '@components/HeaderWaves';
import { Icon } from '@components/Icon';

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

interface BubbleProps {
  size: number;
  style?: StyleProp<ViewStyle>;
}

function Bubble({ size, style }: BubbleProps): React.JSX.Element {
  return (
    <View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          // TODO(theme): translucent white overlay (0.12 alpha) not in palette.
          backgroundColor: 'rgba(255,255,255,0.12)',
        },
        style,
      ]}
    />
  );
}

// Small translucent teardrop (same shape as the illustrations' drops).
function Drop({ size, style }: BubbleProps): React.JSX.Element {
  return (
    <View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderTopLeftRadius: 0,
          // TODO(theme): translucent white overlay (0.28 alpha) not in palette.
          backgroundColor: 'rgba(255,255,255,0.28)',
          transform: [{ rotate: '45deg' }],
        },
        style,
      ]}
    />
  );
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
      <Animated.View style={[StyleSheet.absoluteFill, decorStyle]} pointerEvents="none">
        <Bubble size={92} style={{ left: -34, top: topInset + 92 }} />
        <Bubble size={44} style={{ right: 84, top: topInset + 70 }} />
        <Bubble size={18} style={{ left: '46%', top: topInset + 6 }} />
        <Drop size={12} style={{ right: 128, top: topInset + 128 }} />
        <Drop size={8} style={{ right: 148, top: topInset + 146 }} />
      </Animated.View>
      <Animated.View style={[styles.lens, { top: topInset + 78 }, lensStyle]} pointerEvents="none">
        {/* TODO(theme): translucent white overlay (0.22 alpha) not in palette. */}
        <Icon family="material-community" name="magnify" size={92} color="rgba(255,255,255,0.22)" />
      </Animated.View>

      <Animated.View style={[styles.content, { paddingTop: topInset + 10 }, contentStyle]}>
        <View style={styles.row}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(username)}</Text>
          </View>
          <View style={styles.identity}>
            <Text style={styles.name} numberOfLines={1}>
              {username ?? 'MedTech'}
            </Text>
            <Text style={styles.role}>Medical Technologist</Text>
          </View>
          <View
            style={styles.totalCircle}
            accessible
            accessibilityLabel={`${totalCount} finished sample${totalCount === 1 ? '' : 's'} in total`}
          >
            <Text style={styles.totalNumber}>{totalCount}</Text>
            <Text style={styles.totalLabel}>Total</Text>
          </View>
        </View>

        <Text style={styles.title} accessibilityRole="header">
          Reports
        </Text>
        <Text style={styles.subtitle}>Finished samples, read-only</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  lens: {
    position: 'absolute',
    right: 22,
  },
  content: {
    paddingHorizontal: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    // TODO(theme): translucent white overlay (0.55 alpha) not in palette.
    borderColor: 'rgba(255,255,255,0.55)',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: TEAL,
  },
  identity: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.white,
  },
  role: {
    fontSize: 12,
    // TODO(theme): translucent white overlay (0.8 alpha) not in palette.
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },
  totalCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    // TODO(theme): translucent white overlays (0.18 / 0.35 alpha) not in palette.
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalNumber: {
    fontSize: 17,
    lineHeight: 19,
    fontWeight: '800',
    color: colors.white,
  },
  totalLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: colors.overlayLight,
  },
  title: {
    marginTop: 18,
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    color: colors.white,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.overlayLight,
  },
});
