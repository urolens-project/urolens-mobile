import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useNetworkStatus } from '@hooks/useNetworkStatus';

import { OverrideEntryForm } from '@features/manual-override/components/OverrideEntryForm';
import { useManualOverride } from '@features/manual-override/hooks/useManualOverride';
import { useOverrideContext } from '@features/manual-override/hooks/useOverrideContext';

jest.mock('@features/manual-override/hooks/useManualOverride', () => ({
  useManualOverride: jest.fn(),
}));
jest.mock('@features/manual-override/hooks/useOverrideContext', () => ({
  useOverrideContext: jest.fn(),
}));
jest.mock('@hooks/useNetworkStatus', () => ({ useNetworkStatus: jest.fn() }));
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('@components/OfflineBanner', () => ({ OfflineBanner: () => null }));

const mockSubmit = jest.fn();
const defaultProps = { resultId: 'result-123', specimenId: 'spec-1', parameter: 'wbc' };
const context = { originalAiValue: 12, currentValue: 12, canEdit: true };

beforeEach((): void => {
  jest.clearAllMocks();
  mockSubmit.mockResolvedValue(true);
  (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
  (useManualOverride as jest.Mock).mockReturnValue({
    isSubmitting: false,
    error: null,
    submitOverride: mockSubmit,
  });
  (useOverrideContext as jest.Mock).mockReturnValue({ context, isLoading: false, error: null });
});

function enterCorrection(value = '8', rationale = 'Manual recount'): void {
  fireEvent.changeText(screen.getByLabelText('Corrected value'), value);
  fireEvent.changeText(screen.getByLabelText('Rationale for override'), rationale);
}

describe('override entry screen', () => {
  it('shows the stored AI value without an editable original field', () => {
    render(<OverrideEntryForm {...defaultProps} />);
    expect(screen.getByText('Wbc')).toBeTruthy();
    expect(screen.getByLabelText('Original AI value: 12')).toBeTruthy();
    expect(screen.getByText(/Read-only/)).toBeTruthy();
    expect(screen.getAllByLabelText(/Corrected value|Rationale for override/)).toHaveLength(2);
    expect(useOverrideContext).toHaveBeenCalledWith('result-123', 'wbc');
  });

  it.each(['', '   ', '-1', '1.5', '8abc', 'Infinity', 'NaN', '301', '1e2', '0x10', '12'])(
    'disables submission for count %j',
    (value): void => {
      render(<OverrideEntryForm {...defaultProps} />);
      enterCorrection(value);
      expect(screen.getByRole('button', { name: 'Submit Override' })).toBeDisabled();
    },
  );

  it.each(['', '   ', 'a'.repeat(2001)])(
    'requires a nonblank rationale within the backend limit',
    (rationale): void => {
      render(<OverrideEntryForm {...defaultProps} />);
      enterCorrection('8', rationale);
      expect(screen.getByRole('button', { name: 'Submit Override' })).toBeDisabled();
    },
  );

  it.each(['0', '300'])('accepts boundary count %s with a rationale', (value): void => {
    render(<OverrideEntryForm {...defaultProps} />);
    enterCorrection(value);
    expect(screen.getByRole('button', { name: 'Submit Override' })).not.toBeDisabled();
  });

  it('submits trimmed rationale and returns to the result only after success', async () => {
    render(<OverrideEntryForm {...defaultProps} />);
    enterCorrection('8', '  Manual recount  ');
    await act(async (): Promise<void> => {
      fireEvent.press(screen.getByRole('button', { name: 'Submit Override' }));
    });
    expect(mockSubmit).toHaveBeenCalledWith('result-123', {
      parameter: 'wbc',
      originalAiValue: 12,
      correctedValue: 8,
      rationale: 'Manual recount',
    });
    expect(router.replace).toHaveBeenCalledWith({
      pathname: '/(medtech)/sample/[id]',
      params: { id: 'spec-1', resultId: 'result-123' },
    });
  });

  it('keeps both fields and stays on the screen after a failed submission', async () => {
    mockSubmit.mockResolvedValue(false);
    render(<OverrideEntryForm {...defaultProps} />);
    enterCorrection();
    await act(async (): Promise<void> => {
      fireEvent.press(screen.getByRole('button', { name: 'Submit Override' }));
    });
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Corrected value').props.value).toBe('8');
    expect(screen.getByLabelText('Rationale for override').props.value).toBe('Manual recount');
  });

  it('locks inputs, submit, cancel and back while saving', () => {
    (useManualOverride as jest.Mock).mockReturnValue({
      isSubmitting: true,
      error: null,
      submitOverride: mockSubmit,
    });
    render(<OverrideEntryForm {...defaultProps} />);
    expect(screen.getByLabelText('Corrected value').props.editable).toBe(false);
    expect(screen.getByLabelText('Rationale for override').props.editable).toBe(false);
    expect(screen.getByRole('button', { name: 'Submit Override' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go back to Analysis Result' })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Cancel and go back to Analysis Result' }),
    ).toBeDisabled();
  });

  it('offers a discard choice before leaving an unsaved correction', () => {
    render(<OverrideEntryForm {...defaultProps} />);
    enterCorrection();
    fireEvent.press(screen.getByRole('button', { name: 'Cancel and go back to Analysis Result' }));
    expect(router.replace).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith(
      'Unsaved correction',
      expect.any(String),
      expect.any(Array),
    );
    const buttons = (Alert.alert as jest.Mock).mock.calls[0][2];
    act((): void => {
      buttons
        .find((button: { text: string }): boolean => button.text === 'Discard changes')
        .onPress();
    });
    expect(router.replace).toHaveBeenCalled();
  });

  it('allows restoring the original AI value after an earlier correction', () => {
    (useOverrideContext as jest.Mock).mockReturnValue({
      context: { ...context, currentValue: 8 },
      isLoading: false,
      error: null,
    });
    render(<OverrideEntryForm {...defaultProps} />);
    expect(screen.getByText('Current corrected value: 8')).toBeTruthy();
    enterCorrection('12');
    expect(screen.getByRole('button', { name: 'Submit Override' })).not.toBeDisabled();
  });

  it('explains an offline submission as queued', async () => {
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    render(<OverrideEntryForm {...defaultProps} />);
    enterCorrection();
    await act(async (): Promise<void> => {
      fireEvent.press(screen.getByRole('button', { name: 'Queue Override' }));
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      'Override queued',
      expect.stringContaining('when it syncs'),
    );
    expect(router.replace).toHaveBeenCalled();
  });

  it('shows loading without a fabricated original count', () => {
    (useOverrideContext as jest.Mock).mockReturnValue({
      context: { ...context, originalAiValue: null },
      isLoading: true,
      error: null,
    });
    render(<OverrideEntryForm {...defaultProps} />);
    expect(screen.getByLabelText('Loading original AI finding')).toBeTruthy();
    expect(screen.queryByLabelText('Corrected value')).toBeNull();
  });

  it('blocks a missing original finding and allows returning to the result', () => {
    (useOverrideContext as jest.Mock).mockReturnValue({
      context: { originalAiValue: null, currentValue: null, canEdit: false },
      isLoading: false,
      error: null,
    });
    render(<OverrideEntryForm {...defaultProps} />);
    expect(screen.getByText(/original AI finding is unavailable/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Submit Override' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Go back to Analysis Result' }));
    expect(router.replace).toHaveBeenCalled();
  });

  it('locks the form if the result is finalized while open', async () => {
    const view = render(<OverrideEntryForm {...defaultProps} />);
    enterCorrection();
    (useOverrideContext as jest.Mock).mockReturnValue({
      context: { ...context, canEdit: false },
      isLoading: false,
      error: null,
    });
    view.rerender(<OverrideEntryForm {...defaultProps} />);
    await waitFor((): void => {
      expect(screen.getByRole('button', { name: 'Submit Override' })).toBeDisabled();
    });
    expect(screen.getByText(/no longer editable/)).toBeTruthy();
    expect(screen.getByLabelText('Corrected value').props.editable).toBe(false);
  });

  it('shows backend errors and the preservation notice', () => {
    (useManualOverride as jest.Mock).mockReturnValue({
      isSubmitting: false,
      error: 'Please retry',
      submitOverride: mockSubmit,
    });
    render(<OverrideEntryForm {...defaultProps} />);
    expect(screen.getByText('Please retry')).toBeTruthy();
    expect(screen.getByText(/Both the original AI value/)).toBeTruthy();
  });
});
