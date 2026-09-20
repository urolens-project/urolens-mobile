import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ReportItemCard } from '../../../../src/features/reports/components/ReportItemCard';
import type { ReportItem } from '../../../../src/features/reports/types';

const onPress = jest.fn();

const baseItem: ReportItem = {
  id: 'local-1',
  sampleUid: 'SMP-2026-0040',
  patientUid: 'PT-10200',
  testType: 'Urinalysis',
  priorityLevel: null,
  receivedAt: '2026-09-18T08:00:00+08:00',
  category: 'APPROVED',
  finalizedAt: '2026-09-19T09:20:00+08:00',
  rejectionReason: null,
};

beforeEach(() => jest.clearAllMocks());

describe('ReportItemCard', () => {
  it('shows the patient, sample and test type', () => {
    render(<ReportItemCard item={baseItem} onPress={onPress} />);
    expect(screen.getByText('PT-10200')).toBeTruthy();
    expect(screen.getByText('SMP-2026-0040 · Urinalysis')).toBeTruthy();
  });

  it('falls back to a dash when the test type is missing', () => {
    render(
      <ReportItemCard
        item={{ ...baseItem, testType: null as unknown as string }}
        onPress={onPress}
      />,
    );
    expect(screen.getByText('SMP-2026-0040 · —')).toBeTruthy();
  });

  it('opens the sample by id when pressed', () => {
    render(<ReportItemCard item={baseItem} onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Sample SMP-2026-0040, patient PT-10200' }));
    expect(onPress).toHaveBeenCalledWith('local-1');
  });

  it('shows the rejection reason on a rejected sample, in readable form', () => {
    render(
      <ReportItemCard
        item={{ ...baseItem, category: 'REJECTED', rejectionReason: 'INSUFFICIENT_VOLUME' }}
        onPress={onPress}
      />,
    );
    expect(screen.getByText('INSUFFICIENT VOLUME')).toBeTruthy();
  });

  it('does not show a rejection reason for non-rejected samples', () => {
    render(
      <ReportItemCard item={{ ...baseItem, rejectionReason: 'UNLABELED' }} onPress={onPress} />,
    );
    expect(screen.queryByText('UNLABELED')).toBeNull();
  });
});
