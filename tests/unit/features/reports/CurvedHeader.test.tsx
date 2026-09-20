import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { CurvedHeader } from '../../../../src/features/reports/components/CurvedHeader';
import { getInitials } from '../../../../src/lib/auth/getInitials';

function renderHeader(props: Partial<React.ComponentProps<typeof CurvedHeader>> = {}) {
  return render(
    <CurvedHeader
      username="jane.doe"
      totalCount={7}
      topInset={44}
      playKey={0}
      reduceMotion={false}
      {...props}
    />,
  );
}

describe('CurvedHeader', () => {
  it('shows the screen title and subtitle', () => {
    renderHeader();
    expect(screen.getByText('Reports')).toBeTruthy();
    expect(screen.getByText('Finished samples, read-only')).toBeTruthy();
  });

  it('shows the username, initials and total count', () => {
    renderHeader();
    expect(screen.getByText('jane.doe')).toBeTruthy();
    expect(screen.getByText('JD')).toBeTruthy();
    expect(screen.getByText('7')).toBeTruthy();
  });

  it('falls back to a generic name when there is no username', () => {
    renderHeader({ username: null });
    expect(screen.getByText('MedTech')).toBeTruthy();
    expect(screen.getByText('?')).toBeTruthy();
  });

  it('describes the total for screen readers', () => {
    renderHeader({ totalCount: 1 });
    expect(screen.getByLabelText('1 finished sample in total')).toBeTruthy();
  });

  it('renders with reduced motion', () => {
    renderHeader({ reduceMotion: true });
    expect(screen.getByText('Reports')).toBeTruthy();
  });
});

describe('getInitials', () => {
  it.each([
    ['jane.doe', 'JD'],
    ['Jane Doe', 'JD'],
    ['medtech01', 'M'],
    ['a_b_c', 'AC'],
    ['', '?'],
    ['..', '?'],
    [null, '?'],
  ])('%p -> %p', (input, expected) => {
    expect(getInitials(input as string | null)).toBe(expected);
  });
});
