import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

export interface AlertsHeaderProps {
  unreadCount: number;
  showUnreadOnly: boolean;
  onToggleUnreadOnly: () => void;
  onMarkAllRead: () => void;
}

/**
 * @description Alerts tab title bar: unread-count badge, an "unread only" filter chip,
 * and a "Mark all as read" action.
 * @param unreadCount - Number of unread notifications; badge and mark-all hide at 0.
 * @param showUnreadOnly - Whether the list below is currently filtered to unread only.
 * @param onToggleUnreadOnly - Called when the filter chip is pressed.
 * @param onMarkAllRead - Called when "Mark all as read" is pressed.
 */
export function AlertsHeader({
  unreadCount,
  showUnreadOnly,
  onToggleUnreadOnly,
  onMarkAllRead,
}: AlertsHeaderProps): React.JSX.Element {
  return (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <Text style={styles.headerTitle}>Alerts</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          style={[styles.filterChip, showUnreadOnly && styles.filterChipActive]}
          onPress={onToggleUnreadOnly}
        >
          <Text style={[styles.filterChipText, showUnreadOnly && styles.filterChipTextActive]}>
            Unread only
          </Text>
        </Pressable>

        {unreadCount > 0 && (
          <Pressable onPress={onMarkAllRead}>
            <Text style={styles.markAllText}>Mark all as read</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    gap: spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.smd },
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
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.gray100,
  },
  filterChipActive: { backgroundColor: colors.tealTint },
  filterChipText: { ...typography.body, color: colors.gray500, fontWeight: fontWeight.medium },
  filterChipTextActive: { color: colors.teal, fontWeight: fontWeight.semibold },
  markAllText: { ...typography.body, color: colors.teal, fontWeight: fontWeight.semibold },
});
