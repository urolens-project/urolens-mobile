import { useCallback } from 'react';

import { useNetworkStatus } from '@hooks/useNetworkStatus';

import { alertsApi } from '../api/alertsApi';
import { navigateForNotification } from '../lib/navigateForNotification';
import { queueNotificationRead } from '../lib/queueNotificationRead';
import { useNotificationsActions } from '../store/notificationsStore';
import type { NotificationItem } from '../types';

export interface UseOpenNotificationResult {
  openNotification: (item: NotificationItem) => void;
}

/**
 * @description Marks a notification read (if it wasn't already) and navigates to
 * whatever it relates to. Shared by the Alerts page and the bell preview so selecting a
 * notification behaves identically in both places. Offline, the read receipt is queued
 * instead of sent straight away, so it still reaches the server once the next sync
 * runs rather than being dropped (see queueNotificationRead.ts).
 */
export function useOpenNotification(): UseOpenNotificationResult {
  const { isOnline } = useNetworkStatus();
  const { markRead } = useNotificationsActions();

  const openNotification = useCallback(
    (item: NotificationItem): void => {
      if (!item.isRead) {
        markRead(item.notificationId);
        if (isOnline) {
          alertsApi
            .markRead(item.notificationId)
            .catch((err: unknown) => console.error('[Alerts] failed to mark read', err));
        } else {
          queueNotificationRead(item.notificationId).catch((err: unknown) =>
            console.error('[Alerts] failed to queue mark read', err),
          );
        }
      }
      navigateForNotification(item);
    },
    [isOnline, markRead],
  );

  return { openNotification };
}
