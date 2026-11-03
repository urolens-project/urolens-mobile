// navigateForNotification: routes a tapped Alerts-list row to the right screen.
// Shared by the Alerts page and the bell preview, so every notification type it
// recognizes must land somewhere useful, and an unknown type must do nothing.

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@lib/notifications/notificationHandler', () => ({
  navigateToSpecimenByServerId: jest.fn(() => Promise.resolve()),
}));

import { router } from 'expo-router';
import { navigateToSpecimenByServerId } from '@lib/notifications/notificationHandler';

import { navigateForNotification } from '@features/alerts/lib/navigateForNotification';
import type { NotificationItem } from '@features/alerts/types';

const mockRouterPush = router.push as jest.Mock;
const mockNavigateToSpecimen = navigateToSpecimenByServerId as jest.Mock;

function makeItem(overrides: Partial<NotificationItem> = {}): NotificationItem {
  return {
    notificationId: 'notif-1',
    message: 'something happened',
    notificationType: 'SAMPLE_ASSIGNED',
    entityId: null,
    isRead: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockNavigateToSpecimen.mockResolvedValue(undefined);
});

describe('navigateForNotification', () => {
  it('routes SAMPLE_ASSIGNED to the queue', () => {
    navigateForNotification(makeItem({ notificationType: 'SAMPLE_ASSIGNED' }));
    expect(mockRouterPush).toHaveBeenCalledWith('/(medtech)/queue');
    expect(mockNavigateToSpecimen).not.toHaveBeenCalled();
  });

  it.each([
    'RESULT_RETURNED',
    'RESULT_READY_FOR_REVIEW',
    'SMART_DIAGNOSIS_UNAVAILABLE',
    'CAPTURE_REOPENED',
  ])('routes %s to the specimen via its entityId', (notificationType) => {
    navigateForNotification(makeItem({ notificationType, entityId: 'server-1' }));
    expect(mockNavigateToSpecimen).toHaveBeenCalledWith('server-1');
  });

  it('falls back to queue when navigateToSpecimenByServerId rejects', async () => {
    mockNavigateToSpecimen.mockRejectedValue(new Error('boom'));
    navigateForNotification(
      makeItem({ notificationType: 'CAPTURE_REOPENED', entityId: 'server-1' }),
    );
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockRouterPush).toHaveBeenCalledWith('/(medtech)/queue');
  });

  it('does nothing for an unknown notification type', () => {
    navigateForNotification(makeItem({ notificationType: 'SOMETHING_ELSE' }));
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(mockNavigateToSpecimen).not.toHaveBeenCalled();
  });
});
