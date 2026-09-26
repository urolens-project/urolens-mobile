import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors, spacing } from '@src/theme';

import { COMPACT_WAVES, HeaderWaves } from '@components/HeaderWaves';
import { Icon } from '@components/Icon';

import { REPORT_CATEGORY_STYLES } from '../constants';
import type { ReportCategory } from '../types';

// Deliberately much shorter than the Reports landing header (172): this is a
// working list screen, so it gives the space to the samples instead.
export const CATEGORY_HEADER_BODY_HEIGHT = 116;

type MaterialCommunityIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// The same icon each category's illustration is built around.
const CATEGORY_ICONS: Record<ReportCategory, MaterialCommunityIconName> = {
  PENDING_APPROVAL: 'timer-sand',
  APPROVED: 'check-decagram',
  RELEASED: 'send',
  REJECTED: 'test-tube',
};

export interface CategoryHeaderProps {
  category: ReportCategory;
  title: string;
  count: number;
  topInset: number;
  onBack: () => void;
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

/**
 * @description Animated header for a single report category's drilldown list: back
 * button, title/count, and a chip carrying the category's icon.
 * @param category - Which report category this header represents.
 * @param title - Category title, e.g. "Approved by Supervisor".
 * @param count - Number of samples in this category, shown under the title.
 * @param topInset - Safe-area top inset the header draws under.
 * @param onBack - Called when the back button is pressed.
 * @param playKey - Changes each time the screen is entered, replaying the entrance animation.
 * @param reduceMotion - Skips the entrance animation when true.
 */
export function CategoryHeader({
  category,
  title,
  count,
  topInset,
  onBack,
  playKey,
  reduceMotion,
}: CategoryHeaderProps): React.JSX.Element {
  const { width } = useWindowDimensions();
  const height = topInset + CATEGORY_HEADER_BODY_HEIGHT;
  const { color } = REPORT_CATEGORY_STYLES[category];

  const enter = useRef(new Animated.Value(0)).current;
  const enterBack = useRef(new Animated.Value(0)).current;
  const chip = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      enter.setValue(1);
      enterBack.setValue(1);
      chip.setValue(1);
      return;
    }

    enter.setValue(0);
    enterBack.setValue(0);
    chip.setValue(0);

    // Waves flow down, then the category chip pops in with a little bounce.
    const run = Animated.parallel([
      Animated.spring(enter, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(90),
        Animated.spring(enterBack, { toValue: 1, friction: 8, tension: 55, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(240),
        Animated.spring(chip, { toValue: 1, friction: 4, tension: 90, useNativeDriver: true }),
      ]),
    ]);
    run.start();
    return () => run.stop();
  }, [playKey, reduceMotion, enter, enterBack, chip]);

  const contentStyle = {
    opacity: enter.interpolate({ inputRange: [0.3, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  };
  const decorStyle = {
    opacity: enter.interpolate({ inputRange: [0.4, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
  };
  const chipStyle = {
    opacity: chip.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: 'clamp' }),
    transform: [
      { scale: chip.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
      { rotate: chip.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) },
    ],
  };

  const countLabel = `${count} sample${count === 1 ? '' : 's'}`;

  return (
    <View style={[styles.wrap, { width, height }]}>
      <HeaderWaves
        width={width}
        height={height}
        preset={COMPACT_WAVES}
        topInset={topInset}
        enter={enter}
        enterBack={enterBack}
      />

      <Animated.View style={[StyleSheet.absoluteFill, decorStyle]} pointerEvents="none">
        <Bubble size={70} style={{ left: -22, top: topInset + 46 }} />
        <Bubble size={30} style={{ right: 96, top: topInset + 58 }} />
      </Animated.View>

      <Animated.View style={[styles.row, { paddingTop: topInset + 8 }, contentStyle]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Back to Reports"
        >
          <Icon name="chevron-back" size={24} color={colors.white} />
        </TouchableOpacity>

        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={2} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.subtitle}>{countLabel} · Read-only</Text>
        </View>

        <Animated.View style={[styles.chip, chipStyle]} accessibilityElementsHidden>
          <Icon family="material-community" name={CATEGORY_ICONS[category]} size={24} color={color} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
    paddingLeft: spacing.smd,
    paddingRight: spacing.xl,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // TODO(theme): translucent white overlay (0.18 alpha) not in palette.
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    color: colors.white,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12.5,
    color: colors.overlayLight,
  },
  chip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 5,
    elevation: 4,
  },
});
