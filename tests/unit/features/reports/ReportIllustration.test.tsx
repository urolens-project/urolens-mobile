import React from 'react';
import { render } from '@testing-library/react-native';
import { ReportIllustration } from '../../../../src/features/reports/components/ReportIllustration';
import type { ReportCategory } from '../../../../src/features/reports/types';

function iconNames(category: ReportCategory): string[] {
  const { UNSAFE_root } = render(<ReportIllustration category={category} />);
  return UNSAFE_root.findAll((node) => (node.type as unknown) === 'MaterialCommunityIcons').map(
    (node) => node.props.name as string,
  );
}

// Each category's artwork has to depict that category, not a generic picture.
describe('ReportIllustration', () => {
  it('pending: shows an hourglass', () => {
    expect(iconNames('PENDING_APPROVAL')).toContain('timer-sand');
  });

  it('approved: shows an approval seal', () => {
    expect(iconNames('APPROVED')).toContain('check-decagram');
  });

  it('released: shows a paper plane', () => {
    expect(iconNames('RELEASED')).toContain('send');
  });

  it('rejected: shows a test tube with a cross', () => {
    const names = iconNames('REJECTED');
    expect(names).toContain('test-tube');
    expect(names).toContain('close-circle');
  });

  it('does not show one category’s badge on another', () => {
    expect(iconNames('APPROVED')).not.toContain('timer-sand');
    expect(iconNames('REJECTED')).not.toContain('check-decagram');
    expect(iconNames('PENDING_APPROVAL')).not.toContain('send');
  });

  it('is hidden from screen readers (decorative)', () => {
    const { UNSAFE_root } = render(<ReportIllustration category="RELEASED" />);
    const hidden = UNSAFE_root.findAll(
      (node) => node.props.importantForAccessibility === 'no-hide-descendants',
    );
    expect(hidden.length).toBeGreaterThan(0);
  });
});
