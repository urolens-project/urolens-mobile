import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAsyncAction } from '@hooks/useAsyncAction';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';
import { OfflineBanner } from '@components/OfflineBanner';

import { DEFAULT_NOTIFICATIONS_PAGE_SIZE } from '../constants/alerts.constant';
import { ALERTS_TEXT } from '../constants/alertsText.constant';
import { useMarkAllRead } from '../hooks/useMarkAllRead';
import { useOpenNotification } from '../hooks/useOpenNotification';
import { groupNotificationsByDate } from '../lib/groupByDate';
import {
  loadMoreNotifications,
  loadNotifications,
  useNotificationsList,
  useNotificationsLoaded,
} from '../store/notificationsStore';
import { AlertsHeader } from './AlertsHeader';
import { NotificationCard } from './NotificationCard';

/**
 * @description Notifications tab: lists alerts grouped by date (Today, Yesterday,
 * weekday, then full date), with an unread filter and mark-all-read, and jumps to the
 * relevant specimen on tap.
 */
export function AlertsScreen(): React.JSX.Element {
  const { isOnline } = useNetworkStatus();
  const notifications = useNotificationsList();
  const { markAllRead } = useMarkAllRead();
  const { openNotification } = useOpenNotification();
  const hasLoadedOnce = useNotificationsLoaded();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const fetchPage = useCallback(
    (signal: AbortSignal): Promise<void> =>
      loadNotifications(signal, showUnreadOnly ? { unreadOnly: true } : undefined),
    [showUnreadOnly],
  );
  const { run: refetch, isLoading, error } = useAsyncAction('Alerts', fetchPage);
  // NETWORK_ERROR/TIMEOUT (apiClient.ts) mean the device can't reach the server at all —
  // that's already communicated by the offline banner, so don't also flag it as a refresh
  // failure. Any other code (403, 500, ...) is a real failure the medtech should know about
  // even though stale cached alerts are still on screen.
  const isStaleDataError = !!error && hasLoadedOnce;
  const isSuppressedNetworkError = error?.code === 'NETWORK_ERROR' || error?.code === 'TIMEOUT';
  const { run: fetchMore, isLoading: isLoadingMore } = useAsyncAction(
    'Alerts',
    useCallback(
      (_signal: AbortSignal, beforeId: string) => loadMoreNotifications(beforeId, showUnreadOnly),
      [showUnreadOnly],
    ),
  );

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const handleRefresh = useCallback((): void => {
    void refetch();
  }, [refetch]);

  const handleLoadMore = useCallback((): void => {
    const oldestId = notifications[notifications.length - 1]?.notificationId;
    if (oldestId) void fetchMore(oldestId);
  }, [notifications, fetchMore]);

  const handleToggleUnreadOnly = useCallback((): void => {
    setShowUnreadOnly((prev) => !prev);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const visibleNotifications = showUnreadOnly
    ? notifications.filter((n) => !n.isRead)
    : notifications;
  const sections = groupNotificationsByDate(visibleNotifications);
  // A full page might mean there's another one; the loaded count only ever grows by whole
  // pages (loadMore appends, never trims), so this stays accurate across "load more" taps.
  const hasMore =
    notifications.length > 0 && notifications.length % DEFAULT_NOTIFICATIONS_PAGE_SIZE === 0;

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
      <AlertsHeader
        unreadCount={unreadCount}
        showUnreadOnly={showUnreadOnly}
        onToggleUnreadOnly={handleToggleUnreadOnly}
        onMarkAllRead={markAllRead}
      />

      {!isOnline && <OfflineBanner />}

      {isStaleDataError && !isSuppressedNetworkError && (
        <View style={styles.staleErrorBanner}>
          <Icon name="alert-circle-outline" size={16} color={colors.red700} />
          <Text style={styles.staleErrorText} numberOfLines={2}>
            {ALERTS_TEXT.staleDataErrorPrefix}
            {error?.message || ALERTS_TEXT.loadErrorFallback}
          </Text>
        </View>
      )}

      {error && !hasLoadedOnce ? (
        <View style={styles.centered}>
          <Icon name="cloud-offline-outline" size={40} color={colors.gray400} />
          <Text style={styles.errorText}>{error.message || ALERTS_TEXT.loadErrorFallback}</Text>
          <Pressable style={styles.retryBtn} onPress={handleRefresh}>
            <Text style={styles.retryText}>{ALERTS_TEXT.retryLabel}</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.notificationId}
          renderItem={({ item }) => <NotificationCard item={item} onPress={openNotification} />}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && hasLoadedOnce}
              onRefresh={handleRefresh}
              tintColor={colors.teal}
            />
          }
          contentContainerStyle={
            visibleNotifications.length === 0 ? styles.emptyContainer : styles.listContent
          }
          ListFooterComponent={
            hasMore ? (
              <Pressable
                style={styles.loadMoreBtn}
                onPress={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <ActivityIndicator color={colors.teal} />
                ) : (
                  <Text style={styles.loadMoreText}>{ALERTS_TEXT.loadMoreLabel}</Text>
                )}
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Icon name="notifications-off-outline" size={48} color={colors.gray300} />
              <Text style={styles.emptyTitle}>
                {showUnreadOnly ? ALERTS_TEXT.allCaughtUpTitle : ALERTS_TEXT.noAlertsTitle}
              </Text>
              <Text style={styles.emptySub}>
                {showUnreadOnly ? ALERTS_TEXT.noUnreadNotificationsSub : ALERTS_TEXT.noAlertsSub}
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
  sectionHeader: {
    ...typography.label,
    color: colors.gray500,
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
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
  staleErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.red50,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  staleErrorText: { ...typography.caption, color: colors.red700, flex: 1 },
  retryBtn: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.teal,
  },
  retryText: { ...typography.bodyLg, color: colors.white, fontWeight: fontWeight.semibold },
  loadMoreBtn: {
    marginVertical: spacing.lg,
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.mlg,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  loadMoreText: { ...typography.bodyLg, color: colors.teal, fontWeight: fontWeight.semibold },
});
