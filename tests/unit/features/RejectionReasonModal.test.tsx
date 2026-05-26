// Path: urolens-mobile/tests/unit/features/RejectionReasonModal.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { RejectionReasonModal } from '@features/specimen-rejection/components/RejectionReasonModal';
import { RejectionReason } from '@/types/enums';

const defaultProps = {
  selectedReason: null,
  onSelectReason:  jest.fn(),
  note:            '',
  onNoteChange:    jest.fn(),
  onConfirm:       jest.fn(),
  isLoading:       false,
};

beforeEach(() => jest.clearAllMocks());

describe('RejectionReasonModal', () => {
  describe('rendering', () => {
    it('shows the permanent-action warning banner', () => {
      render(<RejectionReasonModal {...defaultProps} />);
      expect(screen.getByText(/Rejecting a specimen is permanent/i)).toBeTruthy();
    });

    it('renders all four rejection reason options', () => {
      render(<RejectionReasonModal {...defaultProps} />);
      expect(screen.getByText('Insufficient Volume')).toBeTruthy();
      expect(screen.getByText('Wrong Container')).toBeTruthy();
      expect(screen.getByText('Unlabeled Specimen')).toBeTruthy();
      expect(screen.getByText('Other')).toBeTruthy();
    });

    it('renders the notes input', () => {
      render(<RejectionReasonModal {...defaultProps} />);
      expect(screen.getByPlaceholderText(/Add additional context/i)).toBeTruthy();
    });

    it('renders the char counter starting at 0/500', () => {
      render(<RejectionReasonModal {...defaultProps} />);
      expect(screen.getByText('0/500')).toBeTruthy();
    });

    it('renders the Confirm Rejection button', () => {
      render(<RejectionReasonModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Confirm rejection' })).toBeTruthy();
    });
  });

  describe('reason selection', () => {
    it('calls onSelectReason with the correct value when a reason is tapped', () => {
      render(<RejectionReasonModal {...defaultProps} />);
      fireEvent.press(screen.getByText('Insufficient Volume'));
      expect(defaultProps.onSelectReason).toHaveBeenCalledWith(
        RejectionReason.INSUFFICIENT_VOLUME,
      );
    });

    it('calls onSelectReason for Wrong Container', () => {
      render(<RejectionReasonModal {...defaultProps} />);
      fireEvent.press(screen.getByText('Wrong Container'));
      expect(defaultProps.onSelectReason).toHaveBeenCalledWith(
        RejectionReason.WRONG_CONTAINER,
      );
    });

    it('calls onSelectReason for Unlabeled Specimen', () => {
      render(<RejectionReasonModal {...defaultProps} />);
      fireEvent.press(screen.getByText('Unlabeled Specimen'));
      expect(defaultProps.onSelectReason).toHaveBeenCalledWith(
        RejectionReason.UNLABELED,
      );
    });

    it('calls onSelectReason for Other', () => {
      render(<RejectionReasonModal {...defaultProps} />);
      fireEvent.press(screen.getByText('Other'));
      expect(defaultProps.onSelectReason).toHaveBeenCalledWith(RejectionReason.OTHER);
    });

    it('marks selected reason with checked accessibility state', () => {
      render(
        <RejectionReasonModal
          {...defaultProps}
          selectedReason={RejectionReason.WRONG_CONTAINER}
        />,
      );
      const wrongContainerOption = screen.getByRole('radio', { name: 'Wrong Container' });
      expect(wrongContainerOption.props.accessibilityState?.checked).toBe(true);
    });

    it('marks unselected reasons with unchecked accessibility state', () => {
      render(
        <RejectionReasonModal
          {...defaultProps}
          selectedReason={RejectionReason.WRONG_CONTAINER}
        />,
      );
      const otherOption = screen.getByRole('radio', { name: 'Other' });
      expect(otherOption.props.accessibilityState?.checked).toBe(false);
    });
  });

  describe('confirm button', () => {
    it('is disabled when no reason is selected', () => {
      render(<RejectionReasonModal {...defaultProps} />);
      const btn = screen.getByRole('button', { name: 'Confirm rejection' });
      expect(btn.props.accessibilityState?.disabled).toBe(true);
    });

    it('is enabled when a reason is selected', () => {
      render(
        <RejectionReasonModal
          {...defaultProps}
          selectedReason={RejectionReason.UNLABELED}
        />,
      );
      const btn = screen.getByRole('button', { name: 'Confirm rejection' });
      expect(btn.props.accessibilityState?.disabled).toBe(false);
    });

    it('calls onConfirm when pressed with a reason selected', () => {
      render(
        <RejectionReasonModal
          {...defaultProps}
          selectedReason={RejectionReason.INSUFFICIENT_VOLUME}
        />,
      );
      fireEvent.press(screen.getByRole('button', { name: 'Confirm rejection' }));
      expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    });

    it('is disabled and shows loading spinner when isLoading=true', () => {
      render(
        <RejectionReasonModal
          {...defaultProps}
          selectedReason={RejectionReason.OTHER}
          isLoading={true}
        />,
      );
      const btn = screen.getByRole('button', { name: 'Confirm rejection' });
      expect(btn.props.accessibilityState?.disabled).toBe(true);
      expect(screen.queryByText('Confirm Rejection')).toBeNull();
    });
  });

  describe('notes input', () => {
    it('calls onNoteChange when text is entered', () => {
      render(<RejectionReasonModal {...defaultProps} />);
      fireEvent.changeText(
        screen.getByPlaceholderText(/Add additional context/i),
        'Sample was clotted',
      );
      expect(defaultProps.onNoteChange).toHaveBeenCalledWith('Sample was clotted');
    });

    it('displays the current note value', () => {
      render(<RejectionReasonModal {...defaultProps} note="Already checked" />);
      expect(screen.getByDisplayValue('Already checked')).toBeTruthy();
    });

    it('updates char counter to reflect note length', () => {
      const note = 'A'.repeat(42);
      render(<RejectionReasonModal {...defaultProps} note={note} />);
      expect(screen.getByText('42/500')).toBeTruthy();
    });
  });
});
