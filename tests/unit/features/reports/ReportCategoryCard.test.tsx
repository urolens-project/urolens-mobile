import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ReportCategoryCard } from '../../../../src/features/reports/components/ReportCategoryCard';
import {
  REPORT_CATEGORY_DESCRIPTIONS,
  REPORT_CATEGORY_TITLES,
} from '../../../../src/features/reports/types';

const onPress = jest.fn();

beforeEach(() => jest.clearAllMocks());

function renderCard(count: number, category: 'PENDING_APPROVAL' | 'REJECTED' = 'PENDING_APPROVAL') {
  return render(
    <ReportCategoryCard
      category={category}
      title={REPORT_CATEGORY_TITLES[category]}
      count={count}
      onPress={onPress}
    />,
  );
}

describe('ReportCategoryCard', () => {
  it('shows the title and the category description', () => {
    renderCard(3);
    expect(screen.getByText('Pending Supervisor Approval')).toBeTruthy();
    expect(screen.getByText(REPORT_CATEGORY_DESCRIPTIONS.PENDING_APPROVAL)).toBeTruthy();
  });

  it('shows the count and a plural label in the pill', () => {
    renderCard(3);
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('samples')).toBeTruthy();
  });

  it('uses the singular label for exactly one sample', () => {
    renderCard(1);
    expect(screen.getByText('sample')).toBeTruthy();
  });

  it('shows 0 samples for an empty category', () => {
    renderCard(0);
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getByText('samples')).toBeTruthy();
  });

  it('exposes title and count in the accessibility label', () => {
    renderCard(2, 'REJECTED');
    expect(screen.getByRole('button', { name: 'Rejected, 2 samples' })).toBeTruthy();
  });

  it('calls onPress with its category', () => {
    renderCard(2, 'REJECTED');
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledWith('REJECTED');
  });
});
