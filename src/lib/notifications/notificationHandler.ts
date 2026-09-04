import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Q } from '@nozbe/watermelondb';
import { database } from '@db/database';
import Specimen from '@db/models/Specimen';
import apiClient from '@lib/apiClient';
import { synchronize } from '@db/sync/syncManager';

// Show alerts in foreground as a banner
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests notification permission and registers the Expo push token with the
 * backend. Silently skips on iOS free-account / simulator (APNs not available).
 */
export async function registerForPushNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'UroLens Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return;
  }

  let token: string | null = null;
  try {
    const result = await Notifications.getExpoPushTokenAsync();
    token = result.data;
  } catch {
    // iOS free developer account / simulator — APNs unavailable. Skip silently.
    return;
  }

  if (!token) return;

  try {
    await apiClient.post('/users/push-token', { token });
  } catch {
    // Non-fatal — backend can function without a push token
  }
}

/**
 * `sample/[id]`'s route param is the local WatermelonDB row id, but a push
 * notification's `entity_id` is a server id (the backend has no concept of
 * a device's local ids) — resolve the local record first, then navigate.
 */
async function navigateToSpecimenByServerId(serverId: string | undefined): Promise<void> {
  if (!serverId) {
    router.push('/(medtech)/queue');
    return;
  }

  await synchronize().catch(() => {});

  const matches = await database
    .get<Specimen>('specimens')
    .query(Q.where('server_id', serverId))
    .fetch();

  if (matches[0]) {
    router.push(`/(medtech)/sample/${matches[0].id}`);
  } else {
    router.push('/(medtech)/queue');
  }
}

/**
 * Attaches notification listeners to the app.
 * Returns a cleanup function — call it in the layout useEffect cleanup.
 *
 * Received listener  → triggers a sync so local DB stays current.
 * Response listener  → navigates to the correct screen on tap.
 */
export function registerNotificationListeners(): () => void {
  const receivedSub = Notifications.addNotificationReceivedListener(() => {
    synchronize().catch(() => {});
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as {
      notification_type?: string;
      entity_id?: string;
    };

    switch (data?.notification_type) {
      case 'SAMPLE_ASSIGNED':
        synchronize().catch(() => {});
        router.push('/(medtech)/queue');
        break;

      case 'RESULT_RETURNED':
        navigateToSpecimenByServerId(data.entity_id);
        break;

      default:
        router.push('/(medtech)/alerts');
        break;
    }
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
