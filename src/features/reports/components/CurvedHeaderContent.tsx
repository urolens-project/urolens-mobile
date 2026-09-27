import { Animated, StyleSheet, Text, View } from 'react-native';
import type { ComponentProps } from 'react';

import { getInitials } from '@lib/auth/getInitials';
import { colors, spacing } from '@src/theme';

import { TEAL } from '@components/HeaderWaves';

// Matches whatever Animated.View's own `style` prop accepts, since contentStyle is
// an object built from Animated.Value.interpolate() calls, not a plain ViewStyle.
type AnimatedViewStyle = ComponentProps<typeof Animated.View>['style'];

export interface CurvedHeaderContentProps {
  username: string | null;
  totalCount: number;
  topInset: number;
  contentStyle: AnimatedViewStyle;
}

/**
 * @description Curved header's foreground content: avatar, name, lifetime total, and title.
 * @param username - Current medtech's display name; falls back to "MedTech".
 * @param totalCount - Lifetime count of finished samples, shown in the total badge.
 * @param topInset - Safe-area top inset used for the content's top padding.
 * @param contentStyle - Animated fade/slide-in style applied to the whole block.
 */
export function CurvedHeaderContent({
  username,
  totalCount,
  topInset,
  contentStyle,
}: CurvedHeaderContentProps): React.JSX.Element {
  return (
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
  );
}

const styles = StyleSheet.create({
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
