import { act, renderHook } from '@testing-library/react-native';

import { authStoreApi, useAuthStore } from '@lib/auth/authStore';
import { UserRole } from '@app-types/enums';

import { alertsApi } from '@features/alerts/api/alertsApi';
import {
  loadNotifications,
  refreshNotifications,
  useNotificationsActions,
  useNotificationsList,
  useNotificationsLoaded,
  useUnreadNotificationCount,
} from '@features/alerts/store/notificationsStore';
import type { NotificationItem } from '@features/alerts/types';

jest.mock('@features/alerts/api/alertsApi', (): object => ({
  alertsApi: { list: jest.fn() },
}));

const MEDTECH_A_NOTIFICATION: NotificationItem = {
  notificationId: 'medtech-a-notification',
  message: 'A result for Medtech A',
  notificationType: 'RESULT_RETURNED',
  entityId: 'specimen-a',
  isRead: false,
  createdAt: '2026-10-06T00:00:00Z',
};
const MEDTECH_B_NOTIFICATION: NotificationItem = {
  ...MEDTECH_A_NOTIFICATION,
  notificationId: 'medtech-b-notification',
  message: 'A result for Medtech B',
  entityId: 'specimen-b',
};

interface NotificationsSnapshot {
  items: NotificationItem[];
  hasLoadedOnce: boolean;
  unreadCount: number;
}

interface NotificationReadState extends NotificationsSnapshot {
  markRead: (notificationId: string) => void;
  markAllRead: () => void;
}

function useNotificationsSnapshot(): NotificationsSnapshot {
  return {
    items: useNotificationsList(),
    hasLoadedOnce: useNotificationsLoaded(),
    unreadCount: useUnreadNotificationCount(),
  };
}

function useNotificationReadState(): NotificationReadState {
  return { ...useNotificationsSnapshot(), ...useNotificationsActions() };
}

beforeEach((): void => {
  jest.clearAllMocks();
  authStoreApi.clearAuth();
  useAuthStore.getState().setAuthenticated('medtech-a', UserRole.MEDTECH, 'medtechA');
});

describe('notification read status during refresh', (): void => {
  it.each([loadNotifications, refreshNotifications])(
    'keeps marked notifications read when a stale refresh finishes (%#)',
    async (load: () => Promise<void>): Promise<void> => {
      const { result } = renderHook(useNotificationReadState);
      jest.mocked(alertsApi.list).mockResolvedValue([MEDTECH_A_NOTIFICATION]);
      await act(async (): Promise<void> => {
        await load();
      });
      let resolveRefresh!: (items: NotificationItem[]) => void;
      jest.mocked(alertsApi.list).mockImplementationOnce(
        (): Promise<NotificationItem[]> =>
          new Promise((resolve): void => {
            resolveRefresh = resolve;
          }),
      );
      const refresh = load();

      await act(async (): Promise<void> => {
        result.current.markAllRead();
        resolveRefresh([MEDTECH_A_NOTIFICATION, MEDTECH_B_NOTIFICATION]);
        await refresh;
      });

      expect(result.current.items).toEqual([
        { ...MEDTECH_A_NOTIFICATION, isRead: true },
        MEDTECH_B_NOTIFICATION,
      ]);
      expect(result.current.unreadCount).toBe(1);
    },
  );

  it('keeps a single notification read when a refresh starts after it is marked', async (): Promise<void> => {
    const { result } = renderHook(useNotificationReadState);
    jest.mocked(alertsApi.list).mockResolvedValue([MEDTECH_A_NOTIFICATION, MEDTECH_B_NOTIFICATION]);
    await act(async (): Promise<void> => {
      await refreshNotifications();
      result.current.markRead(MEDTECH_A_NOTIFICATION.notificationId);
      await refreshNotifications();
    });

    expect(result.current.items).toEqual([
      { ...MEDTECH_A_NOTIFICATION, isRead: true },
      MEDTECH_B_NOTIFICATION,
    ]);
    expect(result.current.unreadCount).toBe(1);
  });

  it('accepts read status saved on another device', async (): Promise<void> => {
    const { result } = renderHook(useNotificationReadState);
    jest.mocked(alertsApi.list).mockResolvedValue([MEDTECH_A_NOTIFICATION]);
    await act(async (): Promise<void> => {
      await refreshNotifications();
      jest.mocked(alertsApi.list).mockResolvedValue([{ ...MEDTECH_A_NOTIFICATION, isRead: true }]);
      await refreshNotifications();
    });

    expect(result.current.items[0].isRead).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });

  it('does not carry local read status into another account', async (): Promise<void> => {
    const { result } = renderHook(useNotificationReadState);
    jest.mocked(alertsApi.list).mockResolvedValue([MEDTECH_A_NOTIFICATION]);
    await act(async (): Promise<void> => {
      await refreshNotifications();
      result.current.markAllRead();
      authStoreApi.clearAuth();
      useAuthStore.getState().setAuthenticated('medtech-b', UserRole.MEDTECH, 'medtechB');
      await refreshNotifications();
    });

    expect(result.current.items[0].isRead).toBe(false);
    expect(result.current.unreadCount).toBe(1);
  });
});

describe('notification cache account isolation', (): void => {
  it('clears the list, loaded flag, and unread badge on logout', async (): Promise<void> => {
    const { result } = renderHook(useNotificationsSnapshot);
    jest.mocked(alertsApi.list).mockResolvedValue([MEDTECH_A_NOTIFICATION]);
    await act(async (): Promise<void> => {
      await refreshNotifications();
    });
    expect(result.current).toEqual({
      items: [MEDTECH_A_NOTIFICATION],
      hasLoadedOnce: true,
      unreadCount: 1,
    });

    await act(async (): Promise<void> => {
      authStoreApi.clearAuth();
    });

    expect(result.current).toEqual({ items: [], hasLoadedOnce: false, unreadCount: 0 });
  });

  it('clears the cache on a direct account switch', async (): Promise<void> => {
    const { result } = renderHook(useNotificationsSnapshot);
    jest.mocked(alertsApi.list).mockResolvedValue([MEDTECH_A_NOTIFICATION]);
    await act(async (): Promise<void> => {
      await refreshNotifications();
      useAuthStore.getState().setAuthenticated('medtech-b', UserRole.MEDTECH, 'medtechB');
    });

    expect(result.current).toEqual({ items: [], hasLoadedOnce: false, unreadCount: 0 });
  });

  it.each([loadNotifications, refreshNotifications])(
    'ignores a delayed response from an account that signed out (%#)',
    async (load: () => Promise<void>): Promise<void> => {
      let resolveOldRequest!: (items: NotificationItem[]) => void;
      jest.mocked(alertsApi.list).mockImplementationOnce(
        (): Promise<NotificationItem[]> =>
          new Promise((resolve): void => {
            resolveOldRequest = resolve;
          }),
      );
      const { result } = renderHook(useNotificationsSnapshot);
      const oldRequest = load();

      await act(async (): Promise<void> => {
        authStoreApi.clearAuth();
        useAuthStore.getState().setAuthenticated('medtech-b', UserRole.MEDTECH, 'medtechB');
        jest.mocked(alertsApi.list).mockResolvedValue([MEDTECH_B_NOTIFICATION]);
        await loadNotifications();
        resolveOldRequest([MEDTECH_A_NOTIFICATION]);
        await oldRequest;
      });

      expect(result.current).toEqual({
        items: [MEDTECH_B_NOTIFICATION],
        hasLoadedOnce: true,
        unreadCount: 1,
      });
    },
  );

  it('ignores a response from an earlier login by the same medtech', async (): Promise<void> => {
    let resolveOldRequest!: (items: NotificationItem[]) => void;
    jest.mocked(alertsApi.list).mockImplementationOnce(
      (): Promise<NotificationItem[]> =>
        new Promise((resolve): void => {
          resolveOldRequest = resolve;
        }),
    );
    const { result } = renderHook(useNotificationsSnapshot);
    const oldRequest = refreshNotifications();

    await act(async (): Promise<void> => {
      authStoreApi.clearAuth();
      useAuthStore.getState().setAuthenticated('medtech-a', UserRole.MEDTECH, 'medtechA');
      resolveOldRequest([MEDTECH_A_NOTIFICATION]);
      await oldRequest;
    });

    expect(result.current).toEqual({ items: [], hasLoadedOnce: false, unreadCount: 0 });
  });

  it('does not fetch while signed out', async (): Promise<void> => {
    authStoreApi.clearAuth();

    await refreshNotifications();

    expect(alertsApi.list).not.toHaveBeenCalled();
  });

  it('does not cache an aborted screen request', async (): Promise<void> => {
    const { result } = renderHook(useNotificationsSnapshot);
    const controller = new AbortController();
    jest.mocked(alertsApi.list).mockResolvedValue([MEDTECH_A_NOTIFICATION]);

    await act(async (): Promise<void> => {
      const request = loadNotifications(controller.signal);
      controller.abort();
      await request;
    });

    expect(result.current).toEqual({ items: [], hasLoadedOnce: false, unreadCount: 0 });
  });
});
