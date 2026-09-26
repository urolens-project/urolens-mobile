import { useCallback, useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { Ionicons } from '@expo/vector-icons';

import apiClient from '@lib/apiClient';
import { navigateToSpecimenByServerId } from '@lib/notifications/notificationHandler';
import { useAsyncAction } from '@hooks/useAsyncAction';
import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

// Exactly what GET /notifications returns (the backend's NotificationOut, camelCase).
// Note the push-notification payload is a different thing and IS snake_case
// (notification_type / entity_id) — see notificationHandler.ts.
interface NotificationItem {
  notificationId: string;
  message: string;
  notificationType: string;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}

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

interface NotificationCardProps {
  item: NotificationItem;
  onPress: (item: NotificationItem) => void;
}

function NotificationCard({ item, onPress }: NotificationCardProps): React.JSX.Element {
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

/**
 * @description Notifications tab: lists assignment/result alerts and marks them read on tap.
 */
export default function AlertsScreen(): React.JSX.Element {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const fetchNotifications = useCallback(async (signal: AbortSignal): Promise<void> => {
    const res = await apiClient.get<NotificationItem[]>('/notifications', { signal });
    setNotifications(res.data);
  }, []);
  const { run: refetch, isLoading, error } = useAsyncAction('Alerts', fetchNotifications);

  useEffect(() => {
    refetch().finally(() => setHasLoadedOnce(true));
  }, [refetch]);

  const handleRefresh = useCallback((): void => {
    void refetch();
  }, [refetch]);

  const markReadAndNavigate = useCallback((item: NotificationItem): void => {
    if (!item.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.notificationId === item.notificationId ? { ...n, isRead: true } : n)),
      );
      apiClient
        .patch(`/notifications/${item.notificationId}/read`)
        .catch((err: unknown) => console.error('[Alerts] failed to mark read', err));
    }

    switch (item.notificationType) {
      case 'SAMPLE_ASSIGNED':
        router.push('/(medtech)/queue');
        break;
      case 'RESULT_RETURNED':
        // entityId is a server id; the sample route needs the local row id.
        navigateToSpecimenByServerId(item.entityId ?? undefined).catch(() => {
          router.push('/(medtech)/queue');
        });
        break;
      default:
        break;
    }
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (isLoading && !hasLoadedOnce) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alerts</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {error ? (
        <View style={styles.centered}>
          <Icon name="cloud-offline-outline" size={40} color={colors.gray400} />
          <Text style={styles.errorText}>{error.message || 'Could not load notifications.'}</Text>
          <Pressable style={styles.retryBtn} onPress={handleRefresh}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.notificationId}
          renderItem={({ item }) => <NotificationCard item={item} onPress={markReadAndNavigate} />}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && hasLoadedOnce}
              onRefresh={handleRefresh}
              tintColor={colors.teal}
            />
          }
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Icon name="notifications-off-outline" size={48} color={colors.gray300} />
              <Text style={styles.emptyTitle}>No alerts yet</Text>
              <Text style={styles.emptySub}>
                Sample assignments and result updates will appear here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray100 },
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
  listContent: { paddingVertical: spacing.sm },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
    gap: spacing.smd,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  emptyTitle: { ...typography.titleLg, color: colors.gray700 },
  emptySub: { ...typography.body, color: colors.gray500, textAlign: 'center' },
  errorText: { ...typography.bodyLg, color: colors.gray500, textAlign: 'center' },
  retryBtn: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.teal,
  },
  retryText: { ...typography.bodyLg, color: colors.white, fontWeight: fontWeight.semibold },
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
