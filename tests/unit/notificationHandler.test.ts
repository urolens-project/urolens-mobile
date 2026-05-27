// Path: urolens-mobile/tests/unit/notificationHandler.test.ts
// TASK-MOB-14-3: unit tests for src/lib/notifications/notificationHandler.ts

// Mock factories must use inline jest.fn() — referencing outer const variables
// causes TDZ failures because jest.mock() is hoisted above const declarations.
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  AndroidImportance: { HIGH: 4 },
}));

jest.mock('@lib/apiClient', () => ({
  __esModule: true,
  default: { post: jest.fn(() => Promise.resolve()) },
}));

jest.mock('@db/sync/syncManager', () => ({
  synchronize: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

// Platform is already mocked in setup.ts — override per test via direct assignment
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import apiClient from '@lib/apiClient';
import { synchronize } from '@db/sync/syncManager';

import {
  registerForPushNotifications,
  registerNotificationListeners,
} from '@lib/notifications/notificationHandler';

// Typed references to the inline-mocked functions
const mockSetNotificationChannelAsync = Notifications.setNotificationChannelAsync as jest.Mock;
const mockGetPermissionsAsync = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPermissionsAsync = Notifications.requestPermissionsAsync as jest.Mock;
const mockGetExpoPushTokenAsync = Notifications.getExpoPushTokenAsync as jest.Mock;
const mockAddNotificationReceivedListener = Notifications.addNotificationReceivedListener as jest.Mock;
const mockAddNotificationResponseReceivedListener = Notifications.addNotificationResponseReceivedListener as jest.Mock;
const mockApiPost = (apiClient as unknown as { post: jest.Mock }).post;
const mockRouterPush = router.push as jest.Mock;
const mockSynchronize = synchronize as jest.Mock;

beforeEach(() => {
  jest.resetAllMocks();
  // Default: iOS, already granted
  (Platform as unknown as { OS: string }).OS = 'ios';
  mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
  mockRequestPermissionsAsync.mockResolvedValue({ status: 'denied' });
  mockGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[abc123]' });
  mockAddNotificationReceivedListener.mockReturnValue({ remove: jest.fn() });
  mockAddNotificationResponseReceivedListener.mockReturnValue({ remove: jest.fn() });
  mockApiPost.mockResolvedValue(undefined);
  mockSynchronize.mockResolvedValue(undefined);
});

// ── registerForPushNotifications ─────────────────────────────────────────────

describe('registerForPushNotifications', () => {
  it('registers Android notification channel when OS is android', async () => {
    (Platform as unknown as { OS: string }).OS = 'android';
    await registerForPushNotifications();
    expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith('default', expect.objectContaining({
      name: 'UroLens Alerts',
      importance: 4,
    }));
  });

  it('does NOT create Android channel on iOS', async () => {
    await registerForPushNotifications();
    expect(mockSetNotificationChannelAsync).not.toHaveBeenCalled();
  });

  it('skips requestPermissionsAsync when already granted', async () => {
    await registerForPushNotifications();
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('requests permission when not yet granted', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    await registerForPushNotifications();
    expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('returns early without registering token when permission denied', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });
    await registerForPushNotifications();
    expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('posts push token to backend on success', async () => {
    await registerForPushNotifications();
    expect(mockApiPost).toHaveBeenCalledWith('/users/push-token', {
      token: 'ExponentPushToken[abc123]',
    });
  });

  it('silently returns when getExpoPushTokenAsync throws (iOS free account)', async () => {
    mockGetExpoPushTokenAsync.mockRejectedValue(new Error('APNs not configured'));
    await expect(registerForPushNotifications()).resolves.toBeUndefined();
    expect(mockApiPost).not.toHaveBeenCalled();
  });

  it('does not throw when apiClient.post fails (non-fatal)', async () => {
    mockApiPost.mockRejectedValue(new Error('Network error'));
    await expect(registerForPushNotifications()).resolves.toBeUndefined();
  });

  it('returns early without posting when token is null/empty', async () => {
    mockGetExpoPushTokenAsync.mockResolvedValue({ data: null });
    await registerForPushNotifications();
    expect(mockApiPost).not.toHaveBeenCalled();
  });
});

// ── registerNotificationListeners ────────────────────────────────────────────

describe('registerNotificationListeners', () => {
  it('attaches a received listener and a response listener', () => {
    registerNotificationListeners();
    expect(mockAddNotificationReceivedListener).toHaveBeenCalledTimes(1);
    expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalledTimes(1);
  });

  it('returns a cleanup function that removes both subscriptions', () => {
    const removedReceived = jest.fn();
    const removedResponse = jest.fn();
    mockAddNotificationReceivedListener.mockReturnValue({ remove: removedReceived });
    mockAddNotificationResponseReceivedListener.mockReturnValue({ remove: removedResponse });

    const cleanup = registerNotificationListeners();
    cleanup();

    expect(removedReceived).toHaveBeenCalledTimes(1);
    expect(removedResponse).toHaveBeenCalledTimes(1);
  });

  it('triggers synchronize when a notification is received', () => {
    registerNotificationListeners();
    const receivedCb = mockAddNotificationReceivedListener.mock.calls[0][0];
    receivedCb({});
    expect(mockSynchronize).toHaveBeenCalledTimes(1);
  });

  it('navigates to queue and syncs on SAMPLE_ASSIGNED tap', () => {
    registerNotificationListeners();
    const responseCb = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    responseCb({
      notification: { request: { content: { data: { notification_type: 'SAMPLE_ASSIGNED' } } } },
    });
    expect(mockSynchronize).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).toHaveBeenCalledWith('/(medtech)/queue');
  });

  it('navigates to sample detail on RESULT_RETURNED tap with entity_id', () => {
    registerNotificationListeners();
    const responseCb = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    responseCb({
      notification: {
        request: {
          content: {
            data: { notification_type: 'RESULT_RETURNED', entity_id: 'specimen-abc' },
          },
        },
      },
    });
    expect(mockRouterPush).toHaveBeenCalledWith('/(medtech)/sample/specimen-abc');
  });

  it('navigates to queue on RESULT_RETURNED tap without entity_id', () => {
    registerNotificationListeners();
    const responseCb = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    responseCb({
      notification: {
        request: { content: { data: { notification_type: 'RESULT_RETURNED' } } },
      },
    });
    expect(mockRouterPush).toHaveBeenCalledWith('/(medtech)/queue');
  });

  it('navigates to alerts on unknown notification type', () => {
    registerNotificationListeners();
    const responseCb = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    responseCb({
      notification: {
        request: { content: { data: { notification_type: 'UNKNOWN_TYPE' } } },
      },
    });
    expect(mockRouterPush).toHaveBeenCalledWith('/(medtech)/alerts');
  });

  it('navigates to alerts when notification_type is missing', () => {
    registerNotificationListeners();
    const responseCb = mockAddNotificationResponseReceivedListener.mock.calls[0][0];
    responseCb({
      notification: { request: { content: { data: {} } } },
    });
    expect(mockRouterPush).toHaveBeenCalledWith('/(medtech)/alerts');
  });
});
