import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AlertsScreen from '../../../app/(medtech)/alerts';
import apiClient from '@lib/apiClient';
import { router } from 'expo-router';
import { navigateToSpecimenByServerId } from '@lib/notifications/notificationHandler';

jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
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

// The exact shape GET /notifications returns: the backend's NotificationOut, which is
// camelCase. (The push-notification payload is a different thing and is snake_case.)
// An earlier version of this screen read snake_case names, so every field was undefined:
// duplicate/undefined list keys, every alert shown unread, taps that did nothing.
const notification = (overrides: Record<string, unknown> = {}) => ({
  notificationId: 'n-1',
  message: 'A result was returned',
  notificationType: 'RESULT_RETURNED',
  entityId: 'server-spec-1',
  isRead: false,
  createdAt: new Date().toISOString(),
  ...overrides,
});
type ApiNotification = ReturnType<typeof notification>;

async function renderAlerts(data: ApiNotification[]) {
  get.mockResolvedValue({ data });
  render(<AlertsScreen />);
  // FlatList is a stub in the jest setup and never renders its rows, so pull its props
  // off and build the rows the way the list would.
  return waitFor(() => screen.UNSAFE_root.findByType('FlatList' as never));
}

async function tapAlert(n: ApiNotification) {
  const list = await renderAlerts([n]);
  const card = render(list.props.renderItem({ item: n }));
  fireEvent.press(card.getByText(n.message as string));
}

beforeEach(() => jest.clearAllMocks());

describe('the alert list', () => {
  // The React warning "Each child in a list should have a unique key prop".
  it('gives every alert its own key', async () => {
    const data = [
      notification({ notificationId: 'n-1' }),
      notification({ notificationId: 'n-2' }),
      notification({ notificationId: 'n-3' }),
    ];
    const list = await renderAlerts(data);

    const keys = data.map((n) => list.props.keyExtractor(n));
    expect(keys).toEqual(['n-1', 'n-2', 'n-3']);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('shows how many alerts are unread, from the API isRead flag', async () => {
    await renderAlerts([
      notification({ notificationId: 'n-1', isRead: false }),
      notification({ notificationId: 'n-2', isRead: true }),
      notification({ notificationId: 'n-3', isRead: false }),
    ]);
    expect(await screen.findByText('2')).toBeTruthy();
  });

  it('shows a real relative time, not NaN', async () => {
    const list = await renderAlerts([notification()]);
    const card = render(list.props.renderItem({ item: notification() }));
    expect(card.getByText('just now')).toBeTruthy();
    expect(card.queryByText(/NaN/)).toBeNull();
  });
});

describe('tapping an alert', () => {
  it('marks it read using its notificationId', async () => {
    await tapAlert(notification({ notificationId: 'n-42' }));
    expect(patch).toHaveBeenCalledWith('/notifications/n-42/read');
  });

  it('does not call mark-read again for an alert that is already read', async () => {
    await tapAlert(notification({ isRead: true }));
    expect(patch).not.toHaveBeenCalled();
  });

  // The route needs the app's own (local) sample id. entityId is a server id, so pushing
  // `/sample/<entityId>` straight away opened "Sample not found" for the wrong id.
  it('a returned-result alert resolves the local sample instead of using the server id as the route', async () => {
    await tapAlert(notification({ entityId: 'server-spec-1' }));

    expect(navigate).toHaveBeenCalledWith('server-spec-1');
    expect(push).not.toHaveBeenCalledWith('/(medtech)/sample/server-spec-1');
  });

  it('falls back to the Queue if the lookup itself fails', async () => {
    navigate.mockRejectedValueOnce(new Error('db error'));
    await tapAlert(notification());

    await waitFor(() => expect(push).toHaveBeenCalledWith('/(medtech)/queue'));
  });

  it('a returned-result alert with no entity id still goes somewhere useful', async () => {
    await tapAlert(notification({ entityId: null }));
    expect(navigate).toHaveBeenCalledWith(undefined); // the resolver sends this to the Queue
  });

  it('a new-sample alert opens the Queue', async () => {
    await tapAlert(
      notification({ notificationType: 'SAMPLE_ASSIGNED', entityId: 'server-spec-2' }),
    );
    expect(push).toHaveBeenCalledWith('/(medtech)/queue');
    expect(navigate).not.toHaveBeenCalled();
  });
});
