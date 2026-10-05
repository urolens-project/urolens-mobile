import { act, renderHook } from '@testing-library/react-native';

import { authStoreApi, useAuthStore } from '@lib/auth/authStore';
import { UserRole } from '@app-types/enums';

import { alertsApi } from '@features/alerts/api/alertsApi';
import {
  loadNotifications,
  refreshNotifications,
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

function useNotificationsSnapshot(): NotificationsSnapshot {
  return {
    items: useNotificationsList(),
    hasLoadedOnce: useNotificationsLoaded(),
    unreadCount: useUnreadNotificationCount(),
  };
}

beforeEach((): void => {
  jest.clearAllMocks();
  authStoreApi.clearAuth();
  useAuthStore.getState().setAuthenticated('medtech-a', UserRole.MEDTECH, 'medtechA');
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
