import { router } from 'expo-router';

import { navigateToSpecimenByServerId } from '@lib/notifications/notificationHandler';

import type { NotificationItem } from '../types';

/**
 * @description Routes to whatever a notification relates to: the Queue for a new
 * assignment, or the specimen for anything whose entityId is an analysis result. Shared
 * by the Alerts page and the bell preview so both jump to the same place on tap.
 * @param item - The notification that was selected.
 */
export function navigateForNotification(item: NotificationItem): void {
  switch (item.notificationType) {
    case 'SAMPLE_ASSIGNED':
      router.push('/(medtech)/queue');
      break;
    case 'RESULT_RETURNED':
    case 'RESULT_READY_FOR_REVIEW':
    case 'SMART_DIAGNOSIS_UNAVAILABLE':
      // entityId is a server id; the sample route needs the local row id.
      navigateToSpecimenByServerId(item.entityId ?? undefined).catch(() => {
        router.push('/(medtech)/queue');
      });
      break;
    default:
      break;
  }
}
