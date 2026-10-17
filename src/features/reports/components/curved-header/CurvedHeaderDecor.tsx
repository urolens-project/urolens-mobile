import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ComponentProps } from 'react';

import { Icon } from '@components/Icon';

// Matches whatever Animated.View's own `style` prop accepts, since these are objects
// built from Animated.Value.interpolate() calls, not plain ViewStyle.
type AnimatedViewStyle = ComponentProps<typeof Animated.View>['style'];

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

export interface CurvedHeaderDecorProps {
  topInset: number;
  decorStyle: AnimatedViewStyle;
  lensStyle: AnimatedViewStyle;
}

/**
 * @description Decorative bubbles, drops, and magnifier lens layered over the curved
 * header — the urinalysis motif. Purely decorative: hidden from accessibility.
 * @param topInset - Safe-area top inset the decorations are positioned relative to.
 * @param decorStyle - Animated fade-in style for the bubbles/drops.
 * @param lensStyle - Animated fade/rotate/scale style for the magnifier.
 */
export function CurvedHeaderDecor({
  topInset,
  decorStyle,
  lensStyle,
}: CurvedHeaderDecorProps): React.JSX.Element {
  return (
    <>
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
    </>
  );
}

const styles = StyleSheet.create({
  lens: {
    position: 'absolute',
    right: 22,
  },
});
