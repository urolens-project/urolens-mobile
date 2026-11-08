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

import { colors, spacing, typography } from '@src/theme';

import { HeaderWaves, QUEUE_WAVES } from '@components/HeaderWaves';
import { Icon } from '@components/Icon';

import { REPORT_CATEGORY_STYLES } from '../constants';
import { REPORTS_TEXT } from '../constants/reportsText.constant';
import type { ReportCategory } from '../types';

// Matches the Queue/Reports-landing compact formula, so every header in the app
// carries the same visual weight.
export const CATEGORY_HEADER_BODY_HEIGHT = spacing.jumbo * 2 + spacing.lg;

type MaterialCommunityIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// The same icon each category's illustration is built around.
const CATEGORY_ICONS: Record<ReportCategory, MaterialCommunityIconName> = {
  PENDING_APPROVAL: 'timer-sand',
  ESCALATED: 'alert-decagram',
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
  // Keep the curved edge inside the compact body, including on wider screens.
  const waveCurveScale = Math.min(1, (spacing.sm * 4) / width);
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

  const subtitle = REPORTS_TEXT.getCategoryHeaderSubtitle(count);

  return (
    <View style={[styles.wrap, { width, height }]}>
      {/* Solid fill behind the wave, so no gap shows above its curve, including
          during the entrance animation while the wave circles are still sliding in. */}
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

      <Animated.View style={[StyleSheet.absoluteFill, decorStyle]} pointerEvents="none">
        <Bubble size={70} style={{ left: -22, top: topInset + 46 }} />
        <Bubble size={30} style={{ right: 96, top: topInset + 58 }} />
      </Animated.View>

      <Animated.View style={[styles.content, { paddingTop: topInset + spacing.sm }, contentStyle]}>
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel={REPORTS_TEXT.categoryHeaderBackLabel}
          >
            <Icon name="chevron-back" size={24} color={colors.white} />
          </TouchableOpacity>

          <Animated.View style={[styles.chip, chipStyle]} accessibilityElementsHidden>
            <Icon
              family="material-community"
              name={CATEGORY_ICONS[category]}
              size={24}
              color={color}
            />
          </Animated.View>
        </View>

        <Text style={styles.title} numberOfLines={2} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </Animated.View>
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
  content: {
    paddingHorizontal: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: spacing.jumbo - spacing.sm,
    height: spacing.jumbo - spacing.sm,
    borderRadius: (spacing.jumbo - spacing.sm) / 2,
    // TODO(theme): translucent white overlay (0.18 alpha) not in palette.
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    marginTop: spacing.sm,
    ...typography.headingLg,
    color: colors.white,
  },
  subtitle: {
    marginTop: 2,
    ...typography.caption,
    color: colors.overlayLight,
  },
  chip: {
    width: spacing.jumbo - spacing.xs,
    height: spacing.jumbo - spacing.xs,
    borderRadius: (spacing.jumbo - spacing.xs) / 2,
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
