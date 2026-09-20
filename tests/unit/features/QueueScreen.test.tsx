import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';
import QueueScreen from '../../../app/(medtech)/queue';
import { useQueue } from '@features/queue/hooks/useQueue';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { useSyncStatus } from '@hooks/useSyncStatus';
import type { QueueItem } from '@features/queue/types';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ SafeAreaView: 'SafeAreaView' }));
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

// FlatList is a stub in the jest setup and never renders its rows or header, so pull them
// off its props and render them the way the list would.
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

describe('the header of the Queue', () => {
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
    const header = headerOf(render(<QueueScreen />));

    expect(statValue(header, 'Assigned')).toBe(2);
    expect(statValue(header, 'In Progress')).toBe(1);
    expect(statValue(header, 'Returned')).toBe(3);
    expect(header.getByText('6 Active Samples')).toBeTruthy();
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

  it("shows today's date in clinic time", () => {
    setQueue([item('A')]);
    expect(
      headerOf(render(<QueueScreen />)).getByText(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/),
    ).toBeTruthy();
  });
});
