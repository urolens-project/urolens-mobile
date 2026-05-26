// Path: urolens-mobile/tests/unit/features/OverrideEntryForm.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { OverrideEntryForm } from '@features/manual-override/components/OverrideEntryForm';
import { useManualOverride } from '@features/manual-override/hooks/useManualOverride';

jest.mock('@features/manual-override/hooks/useManualOverride', () => ({
  __esModule: true,
  useManualOverride: jest.fn(),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
}));

const mockSubmitOverride = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useManualOverride as jest.Mock).mockReturnValue({
    isSubmitting: false,
    error: null,
    submitOverride: mockSubmitOverride,
  });
});

const defaultProps = {
  resultId: 'result-123',
  parameter: 'wbc',
  originalAiValue: 12,
};

describe('OverrideEntryForm', () => {
  it('renders the parameter name', () => {
    render(<OverrideEntryForm {...defaultProps} />);
    expect(screen.getByText('wbc')).toBeTruthy();
  });

  it('shows the original AI value as read-only', () => {
    render(<OverrideEntryForm {...defaultProps} />);
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText(/read-only/i)).toBeTruthy();
  });

  it('disables submit button when corrected value is empty', () => {
    render(<OverrideEntryForm {...defaultProps} />);
    const submitButton = screen.getByRole('button', { name: /submit override/i });
    expect(submitButton.props.accessibilityState?.disabled ?? submitButton.props.disabled).toBe(true);
  });

  it('disables submit button when rationale is empty', () => {
    render(<OverrideEntryForm {...defaultProps} />);
    fireEvent.changeText(screen.getByLabelText('Corrected value'), '8');
    const submitButton = screen.getByRole('button', { name: /submit override/i });
    expect(submitButton.props.accessibilityState?.disabled ?? submitButton.props.disabled).toBe(true);
  });

  it('enables submit button when both fields are filled', () => {
    render(<OverrideEntryForm {...defaultProps} />);
    fireEvent.changeText(screen.getByLabelText('Corrected value'), '8');
    fireEvent.changeText(screen.getByLabelText('Rationale for override'), 'Recount showed lower value');
    const submitButton = screen.getByRole('button', { name: /submit override/i });
    expect(submitButton.props.accessibilityState?.disabled ?? submitButton.props.disabled).toBeFalsy();
  });

  it('calls submitOverride with correct payload on submit', async () => {
    mockSubmitOverride.mockResolvedValue(undefined);
    render(<OverrideEntryForm {...defaultProps} />);
    fireEvent.changeText(screen.getByLabelText('Corrected value'), '8');
    fireEvent.changeText(screen.getByLabelText('Rationale for override'), 'Recount showed lower value');
    fireEvent.press(screen.getByRole('button', { name: /submit override/i }));

    await waitFor(() => {
      expect(mockSubmitOverride).toHaveBeenCalledWith('result-123', {
        parameter: 'wbc',
        correctedValue: 8,
        rationale: 'Recount showed lower value',
      });
    });
  });

  it('shows error message when submission fails', () => {
    (useManualOverride as jest.Mock).mockReturnValue({
      isSubmitting: false,
      error: 'Failed to submit override',
      submitOverride: mockSubmitOverride,
    });
    render(<OverrideEntryForm {...defaultProps} />);
    expect(screen.getByText('Failed to submit override')).toBeTruthy();
  });

  it('shows the preservation notice', () => {
    render(<OverrideEntryForm {...defaultProps} />);
    expect(screen.getByText(/both the original ai value/i)).toBeTruthy();
  });
});