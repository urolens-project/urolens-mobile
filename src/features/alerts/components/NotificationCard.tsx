import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import type { NotificationItem } from '../types';

/**
 * @description Maps a notification type to its Ionicons glyph.
 * @param type - Raw `notificationType` field from the API.
 */
function notificationIcon(type: string): ComponentProps<typeof Ionicons>['name'] {
  switch (type) {
    case 'SAMPLE_ASSIGNED':
      return 'flask-outline';
    case 'RESULT_RETURNED':
      return 'return-down-back-outline';
    case 'RESULT_READY_FOR_REVIEW':
      return 'checkmark-circle-outline';
    case 'SMART_DIAGNOSIS_UNAVAILABLE':
      return 'warning-outline';
    default:
      return 'notifications-outline';
  }
}

/**
 * @description Formats an ISO timestamp as a short relative time, e.g. "5m ago". 
 * @param iso - ISO 8601 timestamp string.
 */
function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export interface NotificationCardProps {
  item: NotificationItem;
  onPress: (item: NotificationItem) => void;
}

/**
 * @description One row in the Alerts list: icon, message, relative time, and an unread dot.
 * @param item - The notification to render.
 * @param onPress - Called with the notification when the row is tapped.
 */
export function NotificationCard({ item, onPress }: NotificationCardProps): React.JSX.Element {
  return (
    <Pressable
      style={[styles.card, !item.isRead && styles.cardUnread]}
      onPress={() => onPress(item)}
    >
      <View style={styles.iconWrap}>
        <Icon
          name={notificationIcon(item.notificationType)}
          size={22}
          color={item.isRead ? colors.gray400 : colors.teal}
        />
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.message, !item.isRead && styles.messageUnread]}>{item.message}</Text>
        <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
      </View>
      {!item.isRead && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.white,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    borderRadius: radius.lg,
    padding: spacing.mlg,
    gap: spacing.md,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: colors.teal },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.tealTintLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { flex: 1, gap: spacing.xs },
  message: { ...typography.bodyLg, color: colors.gray700, lineHeight: 20 },
  messageUnread: { fontWeight: fontWeight.semibold, color: colors.gray900 },
  time: { ...typography.caption, color: colors.gray400 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.teal,
    marginTop: spacing.xs,
  },
});
