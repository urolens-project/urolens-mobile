import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ComponentProps } from 'react';
import type { MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from '@src/theme';

import { Icon } from '@components/Icon';

export type MaterialCommunityIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

// Everything here is plain Views + vector icons: no SVG dependency, so no
// native rebuild is needed for it. Shared building blocks for the report
// category illustration scenes in illustrationScenes.tsx.

interface DropletProps {
  size: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * @description A teardrop: a square with three rounded corners, turned 45° so the sharp
 * corner points up. The urinalysis motif shared by every illustration.
 * @param size - Width/height of the droplet.
 * @param color - Fill color.
 * @param style - Positioning for this instance within its scene.
 */
export function Droplet({ size, color, style }: DropletProps): React.JSX.Element {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: size / 2,
          borderTopLeftRadius: 0,
          transform: [{ rotate: '45deg' }],
        },
        style,
      ]}
    />
  );
}

/**
 * @description A plain filled circle, used for the small scattered specks around a scene.
 * @param size - Diameter of the dot.
 * @param color - Fill color.
 * @param style - Positioning for this instance within its scene.
 */
export function Dot({ size, color, style }: DropletProps): React.JSX.Element {
  return (
    <View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  );
}

interface PaperProps {
  accent: string;
}

/**
 * @description A lab report sheet: title bar, text lines, and a little result bar chart.
 * @param accent - Category color used for the title bar and bars.
 */
export function Paper({ accent }: PaperProps): React.JSX.Element {
  return (
    <View style={styles.paper}>
      <View style={[styles.paperTitle, { backgroundColor: accent }]} />
      <View style={[styles.paperLine, { width: 44, top: 27 }]} />
      <View style={[styles.paperLine, { width: 44, top: 37 }]} />
      <View style={[styles.paperLine, { width: 28, top: 47 }]} />
      <View style={styles.paperBars}>
        <View style={[styles.paperBar, { height: 10, backgroundColor: accent, opacity: 0.55 }]} />
        <View style={[styles.paperBar, { height: 20, backgroundColor: accent }]} />
        <View style={[styles.paperBar, { height: 14, backgroundColor: accent, opacity: 0.75 }]} />
      </View>
    </View>
  );
}

export type BadgePosition = 'bottomRight' | 'topRight';

interface BadgeProps {
  icon: MaterialCommunityIconName;
  color: string;
  iconSize: number;
  position: BadgePosition;
  /** Extra per-instance styling, e.g. a rotation, layered on top of the position. */
  style?: StyleProp<ViewStyle>;
}

const BADGE_POSITION_STYLES: Record<BadgePosition, ViewStyle> = {
  bottomRight: { right: 2, bottom: 4 },
  topRight: { right: 2, top: 6 },
};

/**
 * @description The small circular icon badge overlaid on a report illustration's corner.
 * @param icon - MaterialCommunityIcons glyph shown inside the badge.
 * @param color - Icon color.
 * @param iconSize - Icon size.
 * @param position - Which corner of the scene the badge sits in.
 * @param style - Extra per-instance styling (e.g. a rotation) on top of the position.
 */
export function Badge({ icon, color, iconSize, position, style }: BadgeProps): React.JSX.Element {
  return (
    <View style={[styles.badge, BADGE_POSITION_STYLES[position], style]}>
      <Icon family="material-community" name={icon} size={iconSize} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    position: 'absolute',
    top: 20,
    left: 26,
    width: 64,
    height: 82,
    borderRadius: 10,
    backgroundColor: colors.white,
    transform: [{ rotate: '-6deg' }],
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 3,
  },
  paperTitle: {
    position: 'absolute',
    top: 11,
    left: 10,
    width: 30,
    height: 6,
    borderRadius: 3,
  },
  paperLine: {
    position: 'absolute',
    left: 10,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray200,
  },
  paperBars: {
    position: 'absolute',
    left: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
  },
  paperBar: {
    width: 7,
    borderRadius: 2,
  },
  badge: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
});
