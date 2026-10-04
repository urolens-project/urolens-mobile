import { create } from 'zustand';

import { alertsApi } from '../api/alertsApi';
import type { NotificationItem } from '../types';

interface NotificationsState {
  items: NotificationItem[];
  hasLoadedOnce: boolean;
  setItems: (items: NotificationItem[]) => void;
  markRead: (notificationId: string) => void;
  markAllRead: () => void;
}

// Not exported: components and other modules must go through the hooks/functions below.
const useNotificationsStore = create<NotificationsState>((set) => ({
  items: [],
  hasLoadedOnce: false,
  setItems: (items) => set({ items, hasLoadedOnce: true }),
  markRead: (notificationId) =>
    set((s) => ({
      items: s.items.map((n) =>
        n.notificationId === notificationId ? { ...n, isRead: true } : n,
      ),
    })),
  markAllRead: () => set((s) => ({ items: s.items.map((n) => ({ ...n, isRead: true })) })),
}));

/** @description Read-only: the signed-in user's notifications, newest first. */
export const useNotificationsList = (): NotificationItem[] =>
  useNotificationsStore((s) => s.items);

/** @description Read-only: whether the list has been fetched at least once this session. */
export const useNotificationsLoaded = (): boolean => useNotificationsStore((s) => s.hasLoadedOnce);

/**
 * @description Read-only: count of unread notifications. Backs the Alerts tab badge,
 * which must be visible from anywhere in the app, not just the Alerts screen itself.
 */
export const useUnreadNotificationCount = (): number =>
  useNotificationsStore((s) => s.items.reduce((count, n) => count + (n.isRead ? 0 : 1), 0));

/** @description Write actions, stable across renders. */
export const useNotificationsActions = (): Pick<
  NotificationsState,
  'setItems' | 'markRead' | 'markAllRead'
> => ({
  setItems: useNotificationsStore((s) => s.setItems),
  markRead: useNotificationsStore((s) => s.markRead),
  markAllRead: useNotificationsStore((s) => s.markAllRead),
});

/**
 * @description Refetches the notification list and refreshes the store. The non-React
 * entry point for places outside a component tree (e.g. the tab layout's app-foreground
 * and reconnect effects) that need the unread badge to stay current.
 */
export async function refreshNotifications(): Promise<void> {
  try {
    const items = await alertsApi.list();
    useNotificationsStore.getState().setItems(items);
  } catch (err) {
    console.error('[Notifications] failed to refresh', err);
  }
}
