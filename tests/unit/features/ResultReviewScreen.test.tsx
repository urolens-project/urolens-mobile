// Path: urolens-mobile/tests/unit/features/ResultReviewScreen.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ResultReviewScreen } from '@features/result-confirmation/components/ResultReviewScreen';
import { AIDisclaimer } from '@features/result-confirmation/components/AIDisclaimer';
import { useResultConfirmation } from '@features/result-confirmation/hooks/useResultConfirmation';
import { useNetworkStatus } from '@hooks/useNetworkStatus';

jest.mock('@features/result-confirmation/hooks/useResultConfirmation', () => ({
  __esModule: true,
  useResultConfirmation: jest.fn(),
}));
jest.mock('@hooks/useNetworkStatus');
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  Stack: { Screen: () => null },
}));
jest.mock('@components/OfflineBanner', () => ({
  OfflineBanner: () => null,
}));

const mockResult = {
  serverId: 'result-123',
  specimenId: 'specimen-1',
  status: 'PENDING_REVIEW' as const,
  isConfirmed: false,
  smartDiagnosis: null,
  smartDiagnosisUnavailable: false,
  aiFindingsJson: JSON.stringify({ rbc: 3, wbc: 12 }),
  get aiFindings() { return JSON.parse(this.aiFindingsJson); },
};

const mockHookReturn = {
  result: mockResult,
  aiFindings: [
    { parameter: 'rbc', count: 3,  isAnomalous: false },
    { parameter: 'wbc', count: 12, isAnomalous: true  },
  ],
  isLoading:    false,
  isConfirming: false,
  error:        null,
  confirmResult: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  (useResultConfirmation as jest.Mock).mockReturnValue(mockHookReturn);
  (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
});

describe('AIDisclaimer', () => {
  it('renders the mandatory compliance text', () => {
    render(<AIDisclaimer />);
    expect(screen.getByText(/clinical decision-support tool/i)).toBeTruthy();
    expect(screen.getByText(/not substitutes for professional medical judgment/i)).toBeTruthy();
  });

  it('renders with correct accessibility role', () => {
    render(<AIDisclaimer />);
    expect(screen.getByRole('text')).toBeTruthy();
  });
});

describe('ResultReviewScreen', () => {
  it('renders AIDisclaimer as the first element', () => {
    render(<ResultReviewScreen resultId="result-123" specimenId="specimen-1" />);
    expect(screen.getByText(/clinical decision-support tool/i)).toBeTruthy();
  });

  it('renders all AI findings', () => {
    render(<ResultReviewScreen resultId="result-123" specimenId="specimen-1" />);
    expect(screen.getByText('rbc')).toBeTruthy();
    expect(screen.getByText('wbc')).toBeTruthy();
  });

  it('shows Confirm Result button when not confirmed', () => {
    render(<ResultReviewScreen resultId="result-123" specimenId="specimen-1" />);
    expect(screen.getByText('Confirm Result')).toBeTruthy();
  });

  it('hides action bar when result is already confirmed', () => {
    (useResultConfirmation as jest.Mock).mockReturnValue({
      ...mockHookReturn,
      result: { ...mockResult, isConfirmed: true, status: 'PENDING_SUPERVISOR_APPROVAL' },
    });
    render(<ResultReviewScreen resultId="result-123" specimenId="specimen-1" />);
    expect(screen.queryByText('Confirm Result')).toBeNull();
    expect(screen.getByText(/submitted for supervisor approval/i)).toBeTruthy();
  });

  it('shows loading indicator while loading', () => {
    (useResultConfirmation as jest.Mock).mockReturnValue({
      ...mockHookReturn,
      isLoading: true,
      result: null,
    });
    render(<ResultReviewScreen resultId="result-123" specimenId="specimen-1" />);
    expect(screen.getByTestId?.('loading') ?? screen.UNSAFE_getByType(require('react-native').ActivityIndicator)).toBeTruthy();
  });

  it('shows error message when confirm fails', () => {
    (useResultConfirmation as jest.Mock).mockReturnValue({
      ...mockHookReturn,
      error: 'Failed to confirm result',
    });
    render(<ResultReviewScreen resultId="result-123" specimenId="specimen-1" />);
    expect(screen.getByText('Failed to confirm result')).toBeTruthy();
  });

  it('shows Queue Confirmation label when offline', () => {
    (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    render(<ResultReviewScreen resultId="result-123" specimenId="specimen-1" />);
    expect(screen.getByText('Queue Confirmation')).toBeTruthy();
  });
});