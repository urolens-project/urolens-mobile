import { database } from '@db/database';
import type PendingSync from '@db/models/PendingSync';
import { PendingSyncAction, PendingSyncStatus } from '@app-types/enums';

// MARK_ALL_NOTIFICATIONS_READ has no single notification to key on — entityId is
// unused by its dispatch (pushChanges.ts), this just satisfies the column.
const ALL_NOTIFICATIONS_ENTITY_ID = 'ALL';

/**
 * @description Queues a "mark read" for the next sync, so a notification read while
 * offline reaches the server eventually instead of being dropped (alertsApi.markRead
 * would otherwise fail silently with nothing retrying it — unlike every other mutation
 * in the app, which already goes through pending_sync).
 * @param notificationId - Server id of the notification.
 */
export async function queueNotificationRead(notificationId: string): Promise<void> {
  await database.write(async (): Promise<void> => {
    await database.get<PendingSync>('pending_sync').create((row) => {
      row.entity = 'notification';
      row.entityId = notificationId;
      row.action = PendingSyncAction.MARK_NOTIFICATION_READ;
      row.payloadJson = '{}';
      row.status = PendingSyncStatus.PENDING;
      row.createdAt = Date.now();
    });
  });
}

/**
 * @description Queues "mark all read" for the next sync, for the same reason as
 * {@link queueNotificationRead}.
 */
export async function queueAllNotificationsRead(): Promise<void> {
  await database.write(async (): Promise<void> => {
    await database.get<PendingSync>('pending_sync').create((row) => {
      row.entity = 'notification';
      row.entityId = ALL_NOTIFICATIONS_ENTITY_ID;
      row.action = PendingSyncAction.MARK_ALL_NOTIFICATIONS_READ;
      row.payloadJson = '{}';
      row.status = PendingSyncStatus.PENDING;
      row.createdAt = Date.now();
    });
  });
}
