import { useCallback } from 'react';

import { useNetworkStatus } from '@hooks/useNetworkStatus';

import { alertsApi } from '../api/alertsApi';
import { queueAllNotificationsRead } from '../lib/queueNotificationRead';
import { useNotificationsActions } from '../store/notificationsStore';

export interface UseMarkAllReadResult {
  markAllRead: () => void;
}

/**
 * @description "Mark all as read": applies locally right away, then sends it on —
 * straight to the server online, queued for the next sync offline (see
 * queueNotificationRead.ts). Shared by the Alerts page and the bell preview so the
 * action behaves identically in both places.
 */
export function useMarkAllRead(): UseMarkAllReadResult {
  const { isOnline } = useNetworkStatus();
  const { markAllRead: markAllReadLocally } = useNotificationsActions();

  const markAllRead = useCallback((): void => {
    markAllReadLocally();
    if (isOnline) {
      alertsApi
        .markAllRead()
        .catch((err: unknown) => console.error('[Alerts] failed to mark all read', err));
    } else {
      queueAllNotificationsRead().catch((err: unknown) =>
        console.error('[Alerts] failed to queue mark all read', err),
      );
    }
  }, [isOnline, markAllReadLocally]);

  return { markAllRead };
}
