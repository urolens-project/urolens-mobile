import { useCallback } from 'react';

import { alertsApi } from '../api/alertsApi';
import { navigateForNotification } from '../lib/navigateForNotification';
import { useNotificationsActions } from '../store/notificationsStore';
import type { NotificationItem } from '../types';

export interface UseOpenNotificationResult {
  openNotification: (item: NotificationItem) => void;
}

/**
 * @description Marks a notification read (if it wasn't already) and navigates to
 * whatever it relates to. Shared by the Alerts page and the bell preview so selecting a
 * notification behaves identically in both places.
 */
export function useOpenNotification(): UseOpenNotificationResult {
  const { markRead } = useNotificationsActions();

  const openNotification = useCallback(
    (item: NotificationItem): void => {
      if (!item.isRead) {
        markRead(item.notificationId);
        alertsApi
          .markRead(item.notificationId)
          .catch((err: unknown) => console.error('[Alerts] failed to mark read', err));
      }
      navigateForNotification(item);
    },
    [markRead],
  );

  return { openNotification };
}
