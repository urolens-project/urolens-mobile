import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

const MAX_DISPLAY_COUNT = 9;

export interface NotificationBadgeProps {
  count: number;
}

/**
 * @description Small unread-count bubble meant to overlay an icon (e.g. a tab bar
 * icon), so the count is visible from anywhere in the app. Renders nothing at 0.
 * @param count - Unread count to display; caps the label at "9+".
 */
export function NotificationBadge({ count }: NotificationBadgeProps): React.JSX.Element | null {
  if (count <= 0) return null;

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{count > MAX_DISPLAY_COUNT ? `${MAX_DISPLAY_COUNT}+` : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: spacing.lg,
    height: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.red600,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxs,
  },
  text: { ...typography.tiny, color: colors.white, fontWeight: fontWeight.bold },
});
