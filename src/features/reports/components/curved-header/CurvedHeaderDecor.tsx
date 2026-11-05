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
  /** Scales bubble/magnifier sizes and offsets for a more compact header. Defaults to full size. */
  scale?: number;
  decorStyle: AnimatedViewStyle;
  lensStyle: AnimatedViewStyle;
}

/**
 * @description Decorative bubbles, drops, and magnifier lens layered over the curved
 * header — the urinalysis motif. Purely decorative: hidden from accessibility.
 * @param topInset - Safe-area top inset the decorations are positioned relative to.
 * @param scale - Size/offset scale for the decoration. Defaults to full size.
 * @param decorStyle - Animated fade-in style for the bubbles/drops.
 * @param lensStyle - Animated fade/rotate/scale style for the magnifier.
 */
export function CurvedHeaderDecor({
  topInset,
  scale = 1,
  decorStyle,
  lensStyle,
}: CurvedHeaderDecorProps): React.JSX.Element {
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, decorStyle]} pointerEvents="none">
        <Bubble size={92 * scale} style={{ left: -34 * scale, top: topInset + 92 * scale }} />
        <Bubble size={44 * scale} style={{ right: 84 * scale, top: topInset + 70 * scale }} />
        <Bubble size={18 * scale} style={{ left: '46%', top: topInset + 6 * scale }} />
        <Drop size={12 * scale} style={{ right: 128 * scale, top: topInset + 128 * scale }} />
        <Drop size={8 * scale} style={{ right: 148 * scale, top: topInset + 146 * scale }} />
      </Animated.View>
      <Animated.View
        style={[styles.lens, { top: topInset + 78 * scale, right: 22 * scale }, lensStyle]}
        pointerEvents="none"
      >
        {/* TODO(theme): translucent white overlay (0.22 alpha) not in palette. */}
        <Icon
          family="material-community"
          name="magnify"
          size={92 * scale}
          color="rgba(255,255,255,0.22)"
        />
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  lens: {
    position: 'absolute',
  },
});
