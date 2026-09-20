import React from 'react';
import { Animated } from 'react-native';
import { render, fireEvent, within } from '@testing-library/react-native';
import QueueScreen from '../../../app/(medtech)/queue';
import { useQueue } from '@features/queue/hooks/useQueue';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { useSyncStatus } from '@hooks/useSyncStatus';
import type { QueueItem } from '@features/queue/types';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({ useIsFocused: () => true }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  useSafeAreaInsets: () => ({ top: 44, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@features/queue/hooks/useQueue', () => ({ useQueue: jest.fn() }));
jest.mock('@hooks/useNetworkStatus', () => ({ useNetworkStatus: jest.fn() }));
jest.mock('@hooks/useSyncStatus', () => ({ useSyncStatus: jest.fn() }));
jest.mock('@lib/auth/authStore', () => ({
  useAuthStore: jest.fn(() => ({ username: 'medtech' })),
}));

const item = (id: string, overrides: Partial<QueueItem> = {}): QueueItem => ({
  id,
  serverId: `srv-${id}`,
  sampleUid: `SMP-${id}`,
  patientName: 'x',
  patientUid: `PT-${id}`,
  testType: 'URINALYSIS_-_ROUTINE',
  status: 'ASSIGNED',
  priorityLevel: 'ROUTINE',
  // 04:30 UTC — 12:30 PM in Manila
  receivedAt: '2026-09-20T04:30:00.000Z',
  medtechId: 'mt-1',
  rejectionReason: null,
  rejectionNote: null,
  rejectedAt: null,
  syncedAt: null,
  isReturnedForCorrection: false,
  ...overrides,
});

function setQueue(items: QueueItem[], allItems: QueueItem[] = items) {
  (useQueue as jest.Mock).mockReturnValue({
    items,
    allItems,
    isLoading: false,
    filter: 'ALL',
    setFilter: jest.fn(),
    refresh: jest.fn(),
    isRefreshing: false,
    lastSyncAt: 1,
  });
}

// FlatList is a stub in the jest setup and never renders its rows or list header, so pull
// them off its props and render them the way the list would. (The title, date and role sit
// in the fixed header above the list, so those are on the screen itself.)
type Screen = ReturnType<typeof render>;
const listOf = (view: Screen) => view.UNSAFE_root.findByType('FlatList' as never);

// The card is rendered in its own tree, so query the screen through its own handle.
function tapCard(view: Screen, target: QueueItem) {
  const card = render(listOf(view).props.renderItem({ item: target }));
  fireEvent.press(card.getByRole('button'));
}

beforeEach(() => {
  jest.clearAllMocks();
  (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
  (useSyncStatus as jest.Mock).mockReturnValue({ state: 'succeeded', lastSuccessAt: 1 });
});

describe('the preview bar shown when a sample is selected', () => {
  it('shows the sample, the patient and when it arrived (clinic time) — not the test type', () => {
    const sample = item('A');
    setQueue([sample]);
    const view = render(<QueueScreen />);

    tapCard(view, sample);

    expect(view.getByText('Selected: SMP-A')).toBeTruthy();
    expect(view.getByText('PT-A • Sep 20, 12:30 PM')).toBeTruthy();
    expect(view.queryByText(/URINALYSIS/i)).toBeNull();
  });

  it('is not shown until a sample is selected', () => {
    setQueue([item('A')]);
    const view = render(<QueueScreen />);
    expect(view.queryByText(/^Selected:/)).toBeNull();
  });
});

describe('the Proceed / Continue button', () => {
  it('says "Proceed to Analysis" for an assigned sample', () => {
    const sample = item('A', { status: 'ASSIGNED' });
    setQueue([sample]);
    const view = render(<QueueScreen />);
    tapCard(view, sample);
    expect(view.getByText('Proceed to Analysis')).toBeTruthy();
  });

  it('says "Continue" for a sample already in progress', () => {
    const sample = item('A', { status: 'PROCESSING' });
    setQueue([sample]);
    const view = render(<QueueScreen />);
    tapCard(view, sample);
    expect(view.getByText('Continue')).toBeTruthy();
    expect(view.queryByText('Proceed to Analysis')).toBeNull();
  });

  // Its specimen still reads ASSIGNED — the returned flag is what makes it "returned".
  it('says "Continue" for a returned sample', () => {
    const sample = item('A', { status: 'ASSIGNED', isReturnedForCorrection: true });
    setQueue([sample]);
    const view = render(<QueueScreen />);
    tapCard(view, sample);
    expect(view.getByText('Continue')).toBeTruthy();
  });
});

describe('the fixed header of the Queue', () => {
  it('shows the title, the active count, the date, the role and the username', () => {
    setQueue([item('a1'), item('a2'), item('p1', { status: 'PROCESSING' })]);
    const view = render(<QueueScreen />);

    expect(view.getByText('My Sample Queue')).toBeTruthy();
    expect(view.getByText('3 Active Samples')).toBeTruthy();
    expect(view.getByText(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/)).toBeTruthy();
    expect(view.getByText('Medical Technologist')).toBeTruthy();
    expect(view.getByText('medtech')).toBeTruthy();
  });

  it('keeps the Sync and Notifications buttons', () => {
    setQueue([item('a1')]);
    const view = render(<QueueScreen />);
    expect(view.getByLabelText('Sync')).toBeTruthy();
    expect(view.getByLabelText('Notifications')).toBeTruthy();
  });

  it('Sync starts a refresh', () => {
    const refresh = jest.fn();
    setQueue([item('a1')]);
    (useQueue as jest.Mock).mockReturnValue({ ...(useQueue as jest.Mock)(), refresh });
    const view = render(<QueueScreen />);
    fireEvent.press(view.getByLabelText('Sync'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('Sync is disabled while offline', () => {
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    setQueue([item('a1')]);
    const view = render(<QueueScreen />);
    const sync = view.getByLabelText('Sync');
    expect(sync.props.accessibilityState?.disabled ?? sync.props.disabled).toBe(true);
  });
});

describe('the list header of the Queue', () => {
  // The list header (stats, status pill) is a prop of the FlatList stub; render it directly.
  const headerOf = (view: Screen) => render(listOf(view).props.ListHeaderComponent);
  const statValue = (header: Screen, label: string) =>
    within(header.getByText(label).parent!).getAllByText(/^\d+$/)[0].props.children;

  it('counts every active sample once, under the status it is shown with', () => {
    const all = [
      item('a1'),
      item('a2'),
      item('p1', { status: 'PROCESSING' }),
      // returned samples whose specimen still reads ASSIGNED / PROCESSING
      item('r1', { isReturnedForCorrection: true }),
      item('r2', { isReturnedForCorrection: true }),
      item('r3', { status: 'PROCESSING', isReturnedForCorrection: true }),
    ];
    setQueue(all);
    const view = render(<QueueScreen />);
    expect(view.getByText('6 Active Samples')).toBeTruthy();
    const header = headerOf(view);

    expect(statValue(header, 'Assigned')).toBe(2);
    expect(statValue(header, 'In Progress')).toBe(1);
    expect(statValue(header, 'Returned')).toBe(3);
  });

  it.each([
    [
      'synced',
      {
        isOnline: true,
        sync: { state: 'succeeded', lastSuccessAt: 1 },
        text: 'Online • Queue Synchronized',
      },
    ],
    [
      'offline',
      {
        isOnline: false,
        sync: { state: 'idle', lastSuccessAt: 1 },
        text: 'Offline • Showing cached data',
      },
    ],
    [
      'sync failed',
      {
        isOnline: true,
        sync: { state: 'failed', lastSuccessAt: 1 },
        text: 'Online • Sync failed, showing cached data',
      },
    ],
  ])('status pill when %s', (_label, { isOnline, sync, text }) => {
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline });
    (useSyncStatus as jest.Mock).mockReturnValue(sync);
    setQueue([item('A')]);
    expect(headerOf(render(<QueueScreen />)).getByText(text)).toBeTruthy();
  });
});

// The filters stay put while the list moves under them; the stats block rolls away, and the
// rows roll under the filters like a wheel. The geometry is covered in scrollEffects.test.ts
// and StickyFilters.test.tsx; this checks the screen is wired to it.
describe('scrolling', () => {
  const headerOf = (view: Screen) => render(listOf(view).props.ListHeaderComponent);

  it('reports the scroll position from the list, on the native thread', () => {
    setQueue([item('a1')]);
    render(<QueueScreen />);

    const event = Animated.event as jest.Mock;
    expect(event).toHaveBeenCalled();
    const [mapping, options] = event.mock.calls[0];
    expect(mapping[0].nativeEvent.contentOffset).toHaveProperty('y');
    expect(options).toEqual({ useNativeDriver: true });
  });

  it('asks the list for scroll events often enough to track the finger', () => {
    setQueue([item('a1')]);
    const view = render(<QueueScreen />);
    expect(listOf(view).props.scrollEventThrottle).toBe(16);
    expect(typeof listOf(view).props.onScroll).toBe('function');
  });

  it('shows the filters on the screen, over the list, not inside the part that scrolls away', () => {
    setQueue([item('a1')]);
    const view = render(<QueueScreen />);

    expect(view.getByText('Date')).toBeTruthy();
    expect(view.getByText('Status')).toBeTruthy();
    expect(headerOf(view).queryByText('Status')).toBeNull();
  });

  it('keeps the stats and the sync pill in the part that scrolls away', () => {
    setQueue([item('a1'), item('p1', { status: 'PROCESSING' })]);
    const header = headerOf(render(<QueueScreen />));
    expect(header.getByText('Assigned')).toBeTruthy();
    expect(header.getByText('Online • Queue Synchronized')).toBeTruthy();
  });

  it('still builds a row for every sample', () => {
    setQueue([item('a1'), item('a2'), item('a3')]);
    const view = render(<QueueScreen />);
    expect(listOf(view).props.data).toHaveLength(3);
    const row = render(listOf(view).props.renderItem({ item: item('a1'), index: 0 }));
    expect(row.getByRole('button')).toBeTruthy();
  });
});
