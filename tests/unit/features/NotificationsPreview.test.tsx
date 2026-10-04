import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

import { NotificationsPreview } from '@features/alerts/components/NotificationsPreview';
import { refreshNotifications } from '@features/alerts/store/notificationsStore';
import apiClient from '@lib/apiClient';
import { router } from 'expo-router';
import { navigateToSpecimenByServerId } from '@lib/notifications/notificationHandler';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn(), patch: jest.fn(() => Promise.resolve()) },
}));
jest.mock('@lib/notifications/notificationHandler', () => ({
  navigateToSpecimenByServerId: jest.fn(() => Promise.resolve()),
}));

const get = apiClient.get as jest.Mock;
const patch = apiClient.patch as jest.Mock;
const push = router.push as jest.Mock;
const navigate = navigateToSpecimenByServerId as jest.Mock;

const notification = (overrides: Record<string, unknown> = {}) => ({
  notificationId: 'n-1',
  message: 'A result was returned',
  notificationType: 'RESULT_RETURNED',
  entityId: 'server-spec-1',
  isRead: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});

// NotificationsPreview reads straight from the shared store (it doesn't fetch itself —
// the tab layout does, via refreshNotifications on mount/foreground/reconnect), so tests
// seed the store the same way: through the real refreshNotifications() against a mocked
// apiClient, not a test-only backdoor.
async function seedNotifications(data: ReturnType<typeof notification>[]): Promise<void> {
  get.mockResolvedValue({ data });
  await refreshNotifications();
}

beforeEach(() => jest.clearAllMocks());

describe('NotificationsPreview', () => {
  it('shows the most recent notifications and the unread count', async () => {
    await seedNotifications([
      notification({ notificationId: 'n-1', isRead: false }),
      notification({ notificationId: 'n-2', isRead: true }),
    ]);
    render(<NotificationsPreview visible onClose={jest.fn()} />);

    expect(screen.getByText('Notifications')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy(); // unread badge
    expect(screen.getAllByText('A result was returned')).toHaveLength(2);
  });

  it('says so clearly when there are no notifications', async () => {
    await seedNotifications([]);
    render(<NotificationsPreview visible onClose={jest.fn()} />);

    expect(screen.getByText('No alerts yet.')).toBeTruthy();
  });

  it('only shows the 5 most recent notifications', async () => {
    await seedNotifications(
      Array.from({ length: 7 }, (_, i) =>
        notification({ notificationId: `n-${i}`, message: `alert ${i}` }),
      ),
    );
    render(<NotificationsPreview visible onClose={jest.fn()} />);

    expect(screen.getByText('alert 0')).toBeTruthy();
    expect(screen.getByText('alert 4')).toBeTruthy();
    expect(screen.queryByText('alert 5')).toBeNull();
    expect(screen.queryByText('alert 6')).toBeNull();
  });

  it('selecting a notification marks it read, navigates, and closes the preview', async () => {
    await seedNotifications([notification({ notificationId: 'n-1', entityId: 'server-spec-1' })]);
    const onClose = jest.fn();
    render(<NotificationsPreview visible onClose={onClose} />);

    fireEvent.press(screen.getByText('A result was returned'));

    expect(patch).toHaveBeenCalledWith('/notifications/n-1/read');
    expect(navigate).toHaveBeenCalledWith('server-spec-1');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('a new-sample alert in the preview opens the Queue', async () => {
    await seedNotifications([
      notification({ notificationType: 'SAMPLE_ASSIGNED', entityId: 'server-spec-2' }),
    ]);
    render(<NotificationsPreview visible onClose={jest.fn()} />);

    fireEvent.press(screen.getByText('A result was returned'));

    expect(push).toHaveBeenCalledWith('/(medtech)/queue');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('marks all as read from the preview without closing it', async () => {
    await seedNotifications([
      notification({ notificationId: 'n-1', isRead: false }),
      notification({ notificationId: 'n-2', isRead: false }),
    ]);
    const onClose = jest.fn();
    render(<NotificationsPreview visible onClose={onClose} />);

    fireEvent.press(screen.getByText('Mark all as read'));

    expect(patch).toHaveBeenCalledWith('/notifications/read-all');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByText('Mark all as read')).toBeNull();
  });

  it('"See all" closes the preview and opens the full Alerts page', async () => {
    await seedNotifications([notification()]);
    const onClose = jest.fn();
    render(<NotificationsPreview visible onClose={onClose} />);

    fireEvent.press(screen.getByText('See all'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/(medtech)/alerts');
  });

  it('closes when the backdrop (outside the sheet) is pressed', async () => {
    await seedNotifications([notification()]);
    const onClose = jest.fn();
    render(<NotificationsPreview visible onClose={onClose} />);

    fireEvent.press(screen.getByTestId('notifications-preview-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
