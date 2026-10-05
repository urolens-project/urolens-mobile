import { create } from 'zustand';

import { useAuthStore } from '@lib/auth/authStore';

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
      items: s.items.map((n) => (n.notificationId === notificationId ? { ...n, isRead: true } : n)),
    })),
  markAllRead: () => set((s) => ({ items: s.items.map((n) => ({ ...n, isRead: true })) })),
}));

let notificationsSession = 0;

// Subscribe for the store's lifetime so logout, expired authentication, and account
// switches all clear the cache before another medtech can see it.
useAuthStore.subscribe((state, previousState): void => {
  if (
    state.userId !== previousState.userId ||
    state.isAuthenticated !== previousState.isAuthenticated
  ) {
    notificationsSession += 1;
    useNotificationsStore.setState({ items: [], hasLoadedOnce: false });
  }
});

/** @description Read-only: the signed-in user's notifications, newest first. */
export const useNotificationsList = (): NotificationItem[] => useNotificationsStore((s) => s.items);

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
  'markRead' | 'markAllRead'
> => ({
  markRead: useNotificationsStore((s) => s.markRead),
  markAllRead: useNotificationsStore((s) => s.markAllRead),
});

/**
 * @description Loads notifications for the current session and ignores responses
 * from an earlier session, so delayed requests cannot restore another user's cache.
 * @param signal - Aborts a screen request when it unmounts or refetches.
 */
export async function loadNotifications(signal?: AbortSignal): Promise<void> {
  const { isAuthenticated, userId } = useAuthStore.getState();
  if (!isAuthenticated || userId === null) return;

  const requestSession = notificationsSession;
  const items = await alertsApi.list(signal);
  if (!signal?.aborted && requestSession === notificationsSession) {
    useNotificationsStore.getState().setItems(items);
  }
}

/**
 * @description Refetches the notification list and refreshes the store. The non-React
 * entry point for places outside a component tree (e.g. the tab layout's app-foreground
 * and reconnect effects) that need the unread badge to stay current.
 */
export async function refreshNotifications(): Promise<void> {
  try {
    await loadNotifications();
  } catch (err) {
    console.error('[Notifications] failed to refresh', err);
  }
}
