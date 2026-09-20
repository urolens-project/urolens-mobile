import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  CATEGORY_HEADER_BODY_HEIGHT,
  CategoryHeader,
} from '../../../../src/features/reports/components/CategoryHeader';
import type { ReportCategory } from '../../../../src/features/reports/types';

const onBack = jest.fn();

function renderHeader(props: Partial<React.ComponentProps<typeof CategoryHeader>> = {}) {
  return render(
    <CategoryHeader
      category="PENDING_APPROVAL"
      title="Pending Supervisor Approval"
      count={3}
      topInset={44}
      onBack={onBack}
      playKey={0}
      reduceMotion={false}
      {...props}
    />,
  );
}

beforeEach(() => jest.clearAllMocks());

describe('CategoryHeader', () => {
  it('shows the category title', () => {
    renderHeader();
    expect(screen.getByText('Pending Supervisor Approval')).toBeTruthy();
  });

  it('shows a plural count with the read-only note', () => {
    renderHeader({ count: 3 });
    expect(screen.getByText('3 samples · Read-only')).toBeTruthy();
  });

  it('uses the singular for one sample and handles zero', () => {
    renderHeader({ count: 1 });
    expect(screen.getByText('1 sample · Read-only')).toBeTruthy();
    renderHeader({ count: 0 });
    expect(screen.getByText('0 samples · Read-only')).toBeTruthy();
  });

  it('goes back when the back button is pressed', () => {
    renderHeader();
    fireEvent.press(screen.getByRole('button', { name: 'Back to Reports' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it.each<[ReportCategory, string]>([
    ['PENDING_APPROVAL', 'timer-sand'],
    ['APPROVED', 'check-decagram'],
    ['RELEASED', 'send'],
    ['REJECTED', 'test-tube'],
  ])('%s shows its own icon (%s)', (category, icon) => {
    const { UNSAFE_root } = renderHeader({ category });
    const names = UNSAFE_root.findAll(
      (node) => (node.type as unknown) === 'MaterialCommunityIcons',
    ).map((node) => node.props.name);
    expect(names).toContain(icon);
  });

  it('renders with reduced motion', () => {
    renderHeader({ reduceMotion: true });
    expect(screen.getByText('Pending Supervisor Approval')).toBeTruthy();
  });

  // The landing header is 172 tall; the working list screens give that
  // space back to the samples.
  it('is shorter than the Reports landing header', () => {
    expect(CATEGORY_HEADER_BODY_HEIGHT).toBeLessThan(172);
  });
});
