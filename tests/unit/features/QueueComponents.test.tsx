import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { QueueHeader } from '../../../src/features/queue/components/QueueHeader';
import { QueueStatsCard } from '../../../src/features/queue/components/QueueStatsCard';
import { SyncStatusPill } from '../../../src/features/queue/components/SyncStatusPill';
import { QueueEmptyState } from '../../../src/features/queue/components/QueueEmptyState';
import { QueueActionBar } from '../../../src/features/queue/components/QueueActionBar';
import { QueueFilterBar } from '../../../src/features/queue/components/QueueFilterBar';
import { QUEUE_STATUS_STYLES } from '../../../src/features/queue/constants';
import type { QueueItem } from '../../../src/features/queue/types';

const item: QueueItem = {
  id: 'local-1',
  serverId: 'srv-1',
  sampleUid: 'SMP-2026-0040',
  patientName: 'x',
  patientUid: 'PT-10200',
  testType: 'Urinalysis',
  status: 'ASSIGNED',
  priorityLevel: 'ROUTINE',
  receivedAt: '2026-09-20T04:30:00.000Z',
  medtechId: 'mt-1',
  rejectionReason: null,
  rejectionNote: null,
  rejectedAt: null,
  syncedAt: null,
  isReturnedForCorrection: false,
};

beforeEach(() => jest.clearAllMocks());

describe('QueueHeader', () => {
  const baseProps = {
    username: 'maria.santos',
    activeCount: 6,
    dateLabel: 'Sep 20, 2026',
    topInset: 44,
    playKey: 0,
    reduceMotion: false,
    live: true,
    syncing: false,
    syncDisabled: false,
    onSync: jest.fn(),
  };

  it('shows the brand, the title, the count, the date, the role and the username', () => {
    const view = render(<QueueHeader {...baseProps} />);
    expect(view.getByText('UroLens')).toBeTruthy();
    expect(view.getByText('Laboratory Diagnostics')).toBeTruthy();
    expect(view.getByText('My Sample Queue')).toBeTruthy();
    expect(view.getByText('6 Active Samples')).toBeTruthy();
    expect(view.getByText('Sep 20, 2026')).toBeTruthy();
    expect(view.getByText('Medical Technologist')).toBeTruthy();
    expect(view.getByText('maria.santos')).toBeTruthy();
  });

  it('leaves the username out when there is none', () => {
    const view = render(<QueueHeader {...baseProps} username={null} />);
    expect(view.queryByText('maria.santos')).toBeNull();
    expect(view.getByText('Medical Technologist')).toBeTruthy();
  });

  it('the Sync button calls onSync', () => {
    const onSync = jest.fn();
    const view = render(<QueueHeader {...baseProps} onSync={onSync} />);
    fireEvent.press(view.getByLabelText('Sync'));
    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it('the Sync button is disabled when told to be', () => {
    const view = render(<QueueHeader {...baseProps} syncDisabled />);
    const sync = view.getByLabelText('Sync');
    expect(sync.props.accessibilityState?.disabled ?? sync.props.disabled).toBe(true);
  });

  it('renders while syncing, with reduced motion, and while out of view', () => {
    expect(
      render(<QueueHeader {...baseProps} syncing />).getByText('My Sample Queue'),
    ).toBeTruthy();
    expect(
      render(<QueueHeader {...baseProps} reduceMotion />).getByText('My Sample Queue'),
    ).toBeTruthy();
    expect(
      render(<QueueHeader {...baseProps} live={false} />).getByText('My Sample Queue'),
    ).toBeTruthy();
  });
});

describe('QueueStatsCard', () => {
  it('shows each status with its count, and the last sync', () => {
    const view = render(
      <QueueStatsCard
        counts={{ assigned: 4, inProgress: 2, returned: 1 }}
        lastSync="5m ago"
        reduceMotion
      />,
    );
    expect(view.getByText('4')).toBeTruthy();
    expect(view.getByText('2')).toBeTruthy();
    expect(view.getByText('1')).toBeTruthy();
    expect(view.getByText('Assigned')).toBeTruthy();
    expect(view.getByText('In Progress')).toBeTruthy();
    expect(view.getByText('Returned')).toBeTruthy();
    expect(view.getByText('Last Sync: 5m ago')).toBeTruthy();
  });
});

describe('SyncStatusPill', () => {
  it.each([
    ['ok', 'Online • Queue Synchronized'],
    ['caution', 'Offline • Showing cached data'],
    ['error', 'Online • Sync failed, showing cached data'],
  ] as const)('shows the %s label', (tone, label) => {
    const view = render(<SyncStatusPill pill={{ tone, label }} live />);
    expect(view.getByText(label)).toBeTruthy();
  });
});

describe('QueueEmptyState', () => {
  it("says you're offline when offline, whatever the filter", () => {
    const view = render(<QueueEmptyState isOnline={false} filter="ASSIGNED" reduceMotion />);
    expect(view.getByText("You're offline")).toBeTruthy();
    expect(view.getByText('Connect to sync your latest queue.')).toBeTruthy();
  });

  it('says there are no matches when a filter is on', () => {
    const view = render(<QueueEmptyState isOnline filter="PROCESSING" reduceMotion />);
    expect(view.getByText('No matches')).toBeTruthy();
    expect(view.getByText('Try selecting a different filter.')).toBeTruthy();
  });

  it('says the queue is clear when there is nothing at all', () => {
    const view = render(<QueueEmptyState isOnline filter="ALL" reduceMotion />);
    expect(view.getByText('Queue is clear')).toBeTruthy();
    expect(view.getByText('No samples are currently assigned to you.')).toBeTruthy();
  });
});

describe('QueueActionBar', () => {
  const props = {
    proceedLabel: 'Proceed to Analysis',
    onReject: jest.fn(),
    onProceed: jest.fn(),
    reduceMotion: true,
  };

  it('is not there until a sample is selected', () => {
    const view = render(<QueueActionBar item={null} {...props} />);
    expect(view.queryByText(/^Selected:/)).toBeNull();
    expect(view.queryByText('Reject')).toBeNull();
  });

  it('shows the selected sample, the patient and the arrival time in clinic time', () => {
    const view = render(<QueueActionBar item={item} {...props} />);
    expect(view.getByText('Selected: SMP-2026-0040')).toBeTruthy();
    expect(view.getByText('PT-10200 • Sep 20, 12:30 PM')).toBeTruthy();
  });

  it('shows the label it is given on the main button', () => {
    const view = render(<QueueActionBar item={item} {...props} proceedLabel="Continue" />);
    expect(view.getByText('Continue')).toBeTruthy();
  });

  it('calls the right handler for each button', () => {
    const onReject = jest.fn();
    const onProceed = jest.fn();
    const view = render(
      <QueueActionBar item={item} {...props} onReject={onReject} onProceed={onProceed} />,
    );

    fireEvent.press(view.getByText('Reject'));
    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onProceed).not.toHaveBeenCalled();

    fireEvent.press(view.getByText('Proceed to Analysis'));
    expect(onProceed).toHaveBeenCalledTimes(1);
  });

  it('goes away again when the selection is cleared', () => {
    const view = render(<QueueActionBar item={item} {...props} />);
    view.rerender(<QueueActionBar item={null} {...props} />);
    expect(view.queryByText(/^Selected:/)).toBeNull();
  });
});

// The filter bar was restyled but its behavior must be exactly what it was.
describe('QueueFilterBar', () => {
  const counts = { ALL: 6, ASSIGNED: 3, PROCESSING: 2, RETURNED: 1 };

  it('All selects ALL', () => {
    const onChange = jest.fn();
    const view = render(<QueueFilterBar selected="DATE" onChange={onChange} counts={counts} />);
    fireEvent.press(view.getByText('All'));
    expect(onChange).toHaveBeenCalledWith('ALL');
  });

  it('shows the total next to All', () => {
    const view = render(<QueueFilterBar selected="ALL" onChange={jest.fn()} counts={counts} />);
    expect(view.getByText('6')).toBeTruthy();
  });

  it('Date selects DATE and reveals Latest and Earliest, which select LATEST / EARLIEST', () => {
    const onChange = jest.fn();
    const view = render(<QueueFilterBar selected="ALL" onChange={onChange} counts={counts} />);
    expect(view.queryByText('Latest')).toBeNull();

    fireEvent.press(view.getByText('Date'));
    expect(onChange).toHaveBeenLastCalledWith('DATE');

    fireEvent.press(view.getByText('Latest'));
    expect(onChange).toHaveBeenLastCalledWith('LATEST');
    fireEvent.press(view.getByText('Earliest'));
    expect(onChange).toHaveBeenLastCalledWith('EARLIEST');
  });

  it('Status selects STATUS and reveals Assigned, In Progress and Returned with their counts', () => {
    const onChange = jest.fn();
    const view = render(<QueueFilterBar selected="ALL" onChange={onChange} counts={counts} />);

    fireEvent.press(view.getByText('Status'));
    expect(onChange).toHaveBeenLastCalledWith('STATUS');

    expect(view.getByText('3')).toBeTruthy();
    expect(view.getByText('2')).toBeTruthy();
    expect(view.getByText('1')).toBeTruthy();

    fireEvent.press(view.getByText('Assigned'));
    expect(onChange).toHaveBeenLastCalledWith('ASSIGNED');
    fireEvent.press(view.getByText('In Progress'));
    expect(onChange).toHaveBeenLastCalledWith('PROCESSING');
    fireEvent.press(view.getByText('Returned'));
    expect(onChange).toHaveBeenLastCalledWith('RETURNED');
  });

  it('starts with the matching row already open when a sub-filter is selected', () => {
    const date = render(
      <QueueFilterBar selected="EARLIEST" onChange={jest.fn()} counts={counts} />,
    );
    expect(date.getByText('Latest')).toBeTruthy();
    const status = render(
      <QueueFilterBar selected="RETURNED" onChange={jest.fn()} counts={counts} />,
    );
    expect(status.getByText('In Progress')).toBeTruthy();
  });
});

describe('QUEUE_STATUS_STYLES', () => {
  it('has the badge labels the Queue has always used', () => {
    expect(QUEUE_STATUS_STYLES.ASSIGNED.label).toBe('ASSIGNED');
    expect(QUEUE_STATUS_STYLES.PROCESSING.label).toBe('IN PROGRESS');
    expect(QUEUE_STATUS_STYLES.RETURNED.label).toBe('RETURNED');
  });
});
