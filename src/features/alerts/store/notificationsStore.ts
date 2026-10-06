import { create } from 'zustand';

import { useAuthStore } from '@lib/auth/authStore';

import { alertsApi, type ListNotificationsParams } from '../api/alertsApi';
import type { NotificationItem } from '../types';

interface NotificationsState {
  items: NotificationItem[];
  hasLoadedOnce: boolean;
  /** The server's true unread count (GET /notifications/unread-count), not derived from
   * `items` — `items` is only ever a page, so deriving from it undercounts once there are
   * more unread notifications than fit on one page. */
  unreadCount: number;
  setItems: (items: NotificationItem[]) => void;
  appendItems: (items: NotificationItem[]) => void;
  setUnreadCount: (count: number) => void;
  markRead: (notificationId: string) => void;
  markAllRead: () => void;
}

// Not exported: components and other modules must go through the hooks/functions below.
const useNotificationsStore = create<NotificationsState>((set) => ({
  items: [],
  hasLoadedOnce: false,
  unreadCount: 0,
  setItems: (items): void =>
    set((state): Pick<NotificationsState, 'items' | 'hasLoadedOnce'> => {
      // Read status only moves forward within a session. A refresh can return an
      // older snapshot while the mark-read request is still being saved.
      const readIds = new Set(
        state.items.filter((item) => item.isRead).map((item) => item.notificationId),
      );
      return {
        items: items.map((item) =>
          readIds.has(item.notificationId) ? { ...item, isRead: true } : item,
        ),
        hasLoadedOnce: true,
      };
    }),
  appendItems: (items): void =>
    set((state): Pick<NotificationsState, 'items'> => {
      const existingIds = new Set(state.items.map((item) => item.notificationId));
      return {
        items: [...state.items, ...items.filter((item) => !existingIds.has(item.notificationId))],
      };
    }),
  setUnreadCount: (unreadCount): void => set({ unreadCount }),
  markRead: (notificationId) =>
    set((s) => {
      const wasUnread = s.items.some((n) => n.notificationId === notificationId && !n.isRead);
      return {
        items: s.items.map((n) =>
          n.notificationId === notificationId ? { ...n, isRead: true } : n,
        ),
        unreadCount: wasUnread ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
      };
    }),
  markAllRead: () =>
    set((s) => ({ items: s.items.map((n) => ({ ...n, isRead: true })), unreadCount: 0 })),
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
    useNotificationsStore.setState({ items: [], hasLoadedOnce: false, unreadCount: 0 });
  }
});

/** @description Read-only: the signed-in user's notifications, newest first. */
export const useNotificationsList = (): NotificationItem[] => useNotificationsStore((s) => s.items);

/** @description Read-only: whether the list has been fetched at least once this session. */
export const useNotificationsLoaded = (): boolean => useNotificationsStore((s) => s.hasLoadedOnce);

/**
 * @description Read-only: the server's true unread count. Backs the Alerts tab badge,
 * which must be visible from anywhere in the app, not just the Alerts screen itself.
 */
export const useUnreadNotificationCount = (): number => useNotificationsStore((s) => s.unreadCount);

/** @description Write actions, stable across renders. */
export const useNotificationsActions = (): Pick<
  NotificationsState,
  'markRead' | 'markAllRead'
> => ({
  markRead: useNotificationsStore((s) => s.markRead),
  markAllRead: useNotificationsStore((s) => s.markAllRead),
});

/**
 * @description Loads a page of notifications and the true unread count for the current
 * session, ignoring responses from an earlier session so delayed requests cannot restore
 * another user's cache. A notification already known locally read overrides what a
 * (now-stale) concurrent response says, the same way `setItems` already treats `items`.
 * @param signal - Aborts a screen request when it unmounts or refetches.
 * @param params - Paging/filter options forwarded to `alertsApi.list`.
 */
export async function loadNotifications(
  signal?: AbortSignal,
  params?: ListNotificationsParams,
): Promise<void> {
  const { isAuthenticated, userId } = useAuthStore.getState();
  if (!isAuthenticated || userId === null) return;

  const requestSession = notificationsSession;
  const [items, unreadCount] = await Promise.all([
    alertsApi.list(params, signal),
    alertsApi.getUnreadCount(signal),
  ]);
  if (signal?.aborted || requestSession !== notificationsSession) return;

  const { items: localItems, setItems, setUnreadCount } = useNotificationsStore.getState();
  const staleUnread = items.filter(
    (item) =>
      !item.isRead &&
      localItems.some((local) => local.notificationId === item.notificationId && local.isRead),
  ).length;
  setItems(items);
  setUnreadCount(Math.max(0, unreadCount - staleUnread));
}

/**
 * @description Fetches an older page before `beforeId` and appends it to the current list,
 * for a "load more" control at the bottom of the Alerts screen. Doesn't touch the unread
 * count — paging in older notifications doesn't change how many are unread.
 * @param beforeId - Id of the oldest currently-loaded notification.
 * @param unreadOnly - Whether the current view is filtered to unread only.
 */
export async function loadMoreNotifications(beforeId: string, unreadOnly = false): Promise<void> {
  const { isAuthenticated, userId } = useAuthStore.getState();
  if (!isAuthenticated || userId === null) return;

  const requestSession = notificationsSession;
  const items = await alertsApi.list({ before: beforeId, unreadOnly });
  if (requestSession !== notificationsSession) return;
  useNotificationsStore.getState().appendItems(items);
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
