import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { QueueItemCard } from '../../../src/features/queue/components/QueueItemCard';
import type { QueueItem } from '../../../src/features/queue/types';

const onPress = jest.fn();

const baseItem: QueueItem = {
  id: 'local-1',
  serverId: 'srv-1',
  sampleUid: 'SMP-2026-0040',
  patientName: 'Test Patient',
  patientUid: 'PT-10200',
  testType: 'Urinalysis',
  status: 'ASSIGNED',
  priorityLevel: 'ROUTINE',
  receivedAt: '2026-09-20T04:30:00.000Z',
  medtechId: 'medtech-1',
  rejectionReason: null,
  rejectionNote: null,
  rejectedAt: null,
  syncedAt: null,
  isReturnedForCorrection: false,
};

const BADGES = ['ASSIGNED', 'IN PROGRESS', 'RETURNED'];

function badgesShown(): string[] {
  return BADGES.filter((label) => screen.queryByText(label) !== null);
}

beforeEach(() => jest.clearAllMocks());

describe('QueueItemCard status badge', () => {
  it('shows an ASSIGNED badge on an assigned sample', () => {
    render(<QueueItemCard item={baseItem} onPress={onPress} />);
    expect(badgesShown()).toEqual(['ASSIGNED']);
  });

  it('shows an IN PROGRESS badge on a sample being analyzed', () => {
    render(<QueueItemCard item={{ ...baseItem, status: 'PROCESSING' }} onPress={onPress} />);
    expect(badgesShown()).toEqual(['IN PROGRESS']);
  });

  it('shows a RETURNED badge on a sample returned for correction', () => {
    render(
      <QueueItemCard item={{ ...baseItem, isReturnedForCorrection: true }} onPress={onPress} />,
    );
    expect(badgesShown()).toEqual(['RETURNED']);
  });

  // The correction flag lives on the result; the specimen itself is usually
  // still ASSIGNED, or already PROCESSING again. One badge, and it's RETURNED.
  it.each(['ASSIGNED', 'PROCESSING', 'COMPLETED'] as const)(
    'a returned sample whose specimen status is %s shows only RETURNED',
    (status) => {
      render(
        <QueueItemCard
          item={{ ...baseItem, status, isReturnedForCorrection: true }}
          onPress={onPress}
        />,
      );
      expect(badgesShown()).toEqual(['RETURNED']);
    },
  );

  it('shows no badge for a status the Queue has no badge for', () => {
    render(<QueueItemCard item={{ ...baseItem, status: 'COMPLETED' }} onPress={onPress} />);
    expect(badgesShown()).toEqual([]);
  });

  it('includes the status in the accessibility label', () => {
    render(<QueueItemCard item={baseItem} onPress={onPress} />);
    expect(
      screen.getByRole('button', { name: 'Sample SMP-2026-0040, patient PT-10200, assigned' }),
    ).toBeTruthy();
  });

  it('still opens the sample by id when pressed', () => {
    render(<QueueItemCard item={baseItem} onPress={onPress} />);
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledWith('local-1');
  });
});

describe('QueueItemCard date and time', () => {
  // receivedAt is 04:30 UTC — 12:30 PM in Manila, the clinic's time.
  it('shows when the sample arrived, in clinic time, after the sample code', () => {
    render(<QueueItemCard item={baseItem} onPress={onPress} />);
    expect(screen.getByText('SMP-2026-0040 · Sep 20, 12:30 PM')).toBeTruthy();
  });

  it('no longer shows the raw test type', () => {
    render(
      <QueueItemCard item={{ ...baseItem, testType: 'URINALYSIS_-_ROUTINE' }} onPress={onPress} />,
    );
    expect(screen.queryByText(/URINALYSIS/i)).toBeNull();
  });

  it('shows the arrival time once, not again on the right', () => {
    render(<QueueItemCard item={baseItem} onPress={onPress} />);
    expect(screen.queryByText('12:30')).toBeNull();
    expect(screen.queryAllByText(/12:30/)).toHaveLength(1);
  });

  it('keeps the whole subtitle on one line, shrinking it on narrow screens instead of cutting off the time', () => {
    render(<QueueItemCard item={baseItem} onPress={onPress} />);
    const subtitle = screen.getByText('SMP-2026-0040 · Sep 20, 12:30 PM');
    expect(subtitle.props.numberOfLines).toBe(1);
    expect(subtitle.props.adjustsFontSizeToFit).toBe(true);
  });

  it('shows a dash rather than "Invalid Date" for an unreadable timestamp', () => {
    render(<QueueItemCard item={{ ...baseItem, receivedAt: 'garbage' }} onPress={onPress} />);
    expect(screen.getByText('SMP-2026-0040 · —')).toBeTruthy();
  });
});
