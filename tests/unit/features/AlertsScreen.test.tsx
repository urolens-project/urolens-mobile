import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AlertsScreen from '../../../app/(medtech)/alerts';
import apiClient from '@lib/apiClient';
import { useAuthStore } from '@lib/auth/authStore';
import { UserRole } from '@app-types/enums';
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
  // SectionList is a stub in the jest setup and never renders its rows, so pull its
  // props off and build the rows the way the list would.
  return waitFor(() => screen.UNSAFE_root.findByType('SectionList' as never));
}

// GET /notifications/unread-count shares the same mocked apiClient.get as the list — route
// by URL so the badge-count fetch doesn't resolve with the list's array as its body.
function mockGetByUrl(listData: ApiNotification[], unreadCount: number): void {
  get.mockImplementation((url: string) =>
    url === '/notifications/unread-count'
      ? Promise.resolve({ data: { unreadCount } })
      : Promise.resolve({ data: listData }),
  );
}

async function tapAlert(n: ApiNotification) {
  const list = await renderAlerts([n]);
  const card = render(list.props.renderItem({ item: n }));
  fireEvent.press(card.getByText(n.message as string));
}

beforeEach((): void => {
  jest.clearAllMocks();
  useAuthStore.getState().clearAuth();
  useAuthStore.getState().setAuthenticated('medtech-1', UserRole.MEDTECH, 'medtech01');
});

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

  it('groups alerts under a "Today" section for same-day notifications', async () => {
    const list = await renderAlerts([
      notification({ notificationId: 'n-1' }),
      notification({ notificationId: 'n-2' }),
    ]);
    expect(list.props.sections).toEqual([
      { title: 'Today', data: expect.arrayContaining([expect.any(Object)]) },
    ]);
    expect(list.props.sections[0].data).toHaveLength(2);
  });
});

describe('filtering to unread only', () => {
  it('hides already-read alerts once the filter chip is pressed', async () => {
    await renderAlerts([
      notification({ notificationId: 'n-1', isRead: false }),
      notification({ notificationId: 'n-2', isRead: true }),
    ]);

    fireEvent.press(screen.getByText('Unread only'));

    const list = await waitFor(() => screen.UNSAFE_root.findByType('SectionList' as never));
    const allItems = list.props.sections.flatMap((s: { data: ApiNotification[] }) => s.data);
    expect(allItems).toHaveLength(1);
    expect(allItems[0].notificationId).toBe('n-1');
  });

  it('says so clearly instead of showing a blank list when nothing unread matches', async () => {
    await renderAlerts([notification({ notificationId: 'n-1', isRead: true })]);

    fireEvent.press(screen.getByText('Unread only'));

    // SectionList is a stub in the jest setup — it never mounts ListEmptyComponent
    // itself, so render the prop directly the way the real list would.
    const list = await waitFor(() => screen.UNSAFE_root.findByType('SectionList' as never));
    const empty = render(list.props.ListEmptyComponent);
    expect(empty.getByText("You're all caught up")).toBeTruthy();
  });
});

describe('marking all as read', () => {
  it('calls the mark-all-read endpoint and clears the unread badge', async () => {
    await renderAlerts([
      notification({ notificationId: 'n-1', isRead: false }),
      notification({ notificationId: 'n-2', isRead: false }),
    ]);
    await screen.findByText('2');

    fireEvent.press(screen.getByText('Mark all as read'));

    expect(patch).toHaveBeenCalledWith('/notifications/read-all');
    await waitFor(() => expect(screen.queryByText('Mark all as read')).toBeNull());
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

  // Previously fell through the navigation switch's default case: marked read but never
  // navigated anywhere, so a MedTech tapping one of these two types went nowhere.
  it('a ready-for-review alert resolves the local sample', async () => {
    await tapAlert(
      notification({ notificationType: 'RESULT_READY_FOR_REVIEW', entityId: 'server-result-1' }),
    );
    expect(navigate).toHaveBeenCalledWith('server-result-1');
  });

  it('a smart-diagnosis-unavailable alert resolves the local sample', async () => {
    await tapAlert(
      notification({
        notificationType: 'SMART_DIAGNOSIS_UNAVAILABLE',
        entityId: 'server-result-2',
      }),
    );
    expect(navigate).toHaveBeenCalledWith('server-result-2');
  });
});

describe('the unread-only toggle refetches from the server', () => {
  it('requests unreadOnly=true instead of only filtering the already-loaded page', async () => {
    mockGetByUrl([notification({ notificationId: 'n-1', isRead: false })], 1);
    render(<AlertsScreen />);
    await waitFor(() => screen.UNSAFE_root.findByType('SectionList' as never));

    fireEvent.press(screen.getByText('Unread only'));

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('/notifications', {
        params: { unreadOnly: true },
        signal: expect.any(AbortSignal),
      }),
    );
  });
});

describe('loading more notifications', () => {
  const fullPage = Array.from({ length: 50 }, (_, i) =>
    notification({ notificationId: `n-${i}`, isRead: false }),
  );

  it('shows a "Load more" control once a full page has loaded', async () => {
    mockGetByUrl(fullPage, 50);
    render(<AlertsScreen />);
    const list = await waitFor(() => screen.UNSAFE_root.findByType('SectionList' as never));

    expect(list.props.ListFooterComponent).not.toBeNull();
  });

  it('does not show "Load more" when fewer than a full page loaded', async () => {
    mockGetByUrl([notification({ notificationId: 'n-1' })], 1);
    render(<AlertsScreen />);
    const list = await waitFor(() => screen.UNSAFE_root.findByType('SectionList' as never));

    expect(list.props.ListFooterComponent).toBeNull();
  });

  it('fetches the next page before the oldest loaded notification on tap', async () => {
    mockGetByUrl(fullPage, 50);
    render(<AlertsScreen />);
    const list = await waitFor(() => screen.UNSAFE_root.findByType('SectionList' as never));

    const footer = render(list.props.ListFooterComponent);
    fireEvent.press(footer.getByText('Load more'));

    await waitFor(() =>
      expect(get).toHaveBeenCalledWith('/notifications', {
        params: { before: 'n-49', unreadOnly: false },
        signal: undefined,
      }),
    );
  });
});
