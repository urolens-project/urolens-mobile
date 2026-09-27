import { StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

export interface AlertsHeaderProps {
  unreadCount: number;
}

/**
 * @description Alerts tab title bar with an unread-count badge.
 * @param unreadCount - Number of unread notifications; badge hides at 0.
 */
export function AlertsHeader({ unreadCount }: AlertsHeaderProps): React.JSX.Element {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Alerts</Text>
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    gap: spacing.smd,
  },
  headerTitle: { ...typography.headingLg, color: colors.gray900 },
  badge: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    minWidth: spacing.xl,
    alignItems: 'center',
  },
  badgeText: { ...typography.caption, color: colors.white, fontWeight: fontWeight.bold },
});
