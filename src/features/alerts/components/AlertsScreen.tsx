import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import apiClient from '@lib/apiClient';
import { navigateToSpecimenByServerId } from '@lib/notifications/notificationHandler';
import { useAsyncAction } from '@hooks/useAsyncAction';
import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { AlertsHeader } from './AlertsHeader';
import { NotificationCard } from './NotificationCard';
import type { NotificationItem } from '../types';

/**
 * @description Notifications tab: lists assignment/result alerts and marks them read on tap.
 */
export function AlertsScreen(): React.JSX.Element {
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
      <AlertsHeader unreadCount={unreadCount} />

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
});
