import { useCallback } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { alertsApi } from '../api/alertsApi';
import { useOpenNotification } from '../hooks/useOpenNotification';
import { useNotificationsActions, useNotificationsList } from '../store/notificationsStore';
import { NotificationCard } from './NotificationCard';
import type { NotificationItem } from '../types';

const PREVIEW_LIMIT = 5;

export interface NotificationsPreviewProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * @description Preview of the most recent notifications, opened from the Alerts tab
 * icon (the app's notification bell) without navigating away from the current screen.
 * Tapping outside closes it; "See all" is the only way from here to the full Alerts page.
 * @param visible - Whether the preview is shown.
 * @param onClose - Called on backdrop press, after selecting a notification, and after
 * "See all".
 */
export function NotificationsPreview({
  visible,
  onClose,
}: NotificationsPreviewProps): React.JSX.Element {
  const notifications = useNotificationsList();
  const { markAllRead } = useNotificationsActions();
  const { openNotification } = useOpenNotification();

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const recent = notifications.slice(0, PREVIEW_LIMIT);

  const handleSelect = useCallback(
    (item: NotificationItem): void => {
      openNotification(item);
      onClose();
    },
    [openNotification, onClose],
  );

  const handleMarkAllRead = useCallback((): void => {
    markAllRead();
    alertsApi
      .markAllRead()
      .catch((err: unknown) => console.error('[Alerts] failed to mark all read', err));
  }, [markAllRead]);

  const handleSeeAll = useCallback((): void => {
    onClose();
    router.push('/(medtech)/alerts');
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable testID="notifications-preview-backdrop" style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            {unreadCount > 0 && (
              <Pressable onPress={handleMarkAllRead}>
                <Text style={styles.markAllText}>Mark all as read</Text>
              </Pressable>
            )}
          </View>

          {recent.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No alerts yet.</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {recent.map((item) => (
                <NotificationCard key={item.notificationId} item={item} onPress={handleSelect} />
              ))}
            </ScrollView>
          )}

          <Pressable style={styles.seeAllBtn} onPress={handleSeeAll}>
            <Text style={styles.seeAllText}>See all</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.gray100,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? spacing.huge : spacing.xxl,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.smd },
  title: { ...typography.titleLg, color: colors.gray900 },
  badge: {
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    minWidth: spacing.xl,
    alignItems: 'center',
  },
  badgeText: { ...typography.caption, color: colors.white, fontWeight: fontWeight.bold },
  markAllText: { ...typography.body, color: colors.teal, fontWeight: fontWeight.semibold },
  empty: { paddingVertical: spacing.xxxl, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.gray500 },
  seeAllBtn: {
    marginTop: spacing.sm,
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.mlg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  seeAllText: { ...typography.bodyLg, color: colors.teal, fontWeight: fontWeight.semibold },
});
