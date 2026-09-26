import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { StyleProp, TextStyle } from 'react-native';

import { colors } from '@src/theme';

type IoniconsName = ComponentProps<typeof Ionicons>['name'];
type MaterialCommunityIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type IconFamily = 'ionicons' | 'material-community';

export interface IconProps {
  name: IoniconsName | MaterialCommunityIconName;
  family?: IconFamily;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * @description Single entry point for icons so the icon set can be swapped or extended
 * in one place. Defaults to Ionicons; pass `family="material-community"` for glyphs
 * (e.g. "microscope", "test-tube") that only exist in MaterialCommunityIcons.
 * @param name - Glyph name for the selected family.
 * @param family - Icon set to render from. Defaults to 'ionicons'.
 * @param size - Pixel size, defaults to 20.
 * @param color - Defaults to the primary text color.
 * @param style - Passed through for layout needs (e.g. margin next to adjacent text).
 */
export function Icon({
  name,
  family = 'ionicons',
  size = 20,
  color = colors.gray700,
  style,
}: IconProps): React.JSX.Element {
  if (family === 'material-community') {
    return (
      <MaterialCommunityIcons
        name={name as MaterialCommunityIconName}
        size={size}
        color={color}
        style={style}
      />
    );
  }
  return <Ionicons name={name as IoniconsName} size={size} color={color} style={style} />;
}
