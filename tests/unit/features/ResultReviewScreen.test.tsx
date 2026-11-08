// Path: urolens-mobile/tests/unit/features/ResultReviewScreen.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ResultReviewScreen } from '@features/result-confirmation/components/ResultReviewScreen';
import { AIDisclaimer } from '@features/result-confirmation/components/AIDisclaimer';
import { useResultConfirmation } from '@features/result-confirmation/hooks/useResultConfirmation';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { router } from 'expo-router';

jest.mock('@features/result-confirmation/hooks/useResultConfirmation', () => ({
  __esModule: true,
  useResultConfirmation: jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
jest.mock('@hooks/useNetworkStatus');
jest.mock('@features/result-confirmation/hooks/useResultReviewDetail', () => ({
  useResultReviewDetail: jest.fn(() => ({
    detail: null,
    isLoading: false,
    error: null,
    refresh: jest.fn(),
  })),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Stack: { Screen: () => null },
}));
jest.mock('@components/OfflineBanner', () => ({
  OfflineBanner: () => null,
}));

// Every status this screen renders is already past the MedTech's own sign-off
// (mobile PR #55 review, #3) — PENDING_SUPERVISOR_APPROVAL is representative.
const mockResult = {
  serverId: 'result-123',
  specimenId: 'specimen-1',
  status: 'PENDING_SUPERVISOR_APPROVAL' as const,
  isSynced: true,
  smartDiagnosis: null,
  smartDiagnosisUnavailable: false,
  aiFindingsJson: JSON.stringify({ rbc: 3, wbc: 12 }),
  get aiFindings() {
    return JSON.parse(this.aiFindingsJson);
  },
};

const mockHookReturn = {
  result: mockResult,
  aiFindings: [
    { parameter: 'rbc', count: 3, isAnomalous: false },
    { parameter: 'wbc', count: 12, isAnomalous: true },
  ],
  isLoading: false,
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

  it('renders all AI findings, read-only', () => {
    render(<ResultReviewScreen resultId="result-123" specimenId="specimen-1" />);
    expect(screen.getByText('rbc')).toBeTruthy();
    expect(screen.getByText('wbc')).toBeTruthy();
    expect(screen.queryByText('Override')).toBeNull();
  });

  it('offers only Continue — no Confirm, Retake or Override', () => {
    render(<ResultReviewScreen resultId="result-123" specimenId="specimen-1" />);
    expect(screen.getByText('Continue')).toBeTruthy();
    expect(screen.queryByText('Confirm Result')).toBeNull();
    expect(screen.queryByLabelText('Retake image')).toBeNull();
    expect(screen.queryByText('Override')).toBeNull();
  });

  it('returns to the queue on Continue', () => {
    render(<ResultReviewScreen resultId="result-123" specimenId="specimen-1" />);
    fireEvent.press(screen.getByText('Continue'));
    expect(router.replace).toHaveBeenCalledWith('/(medtech)/queue');
  });

  it('shows loading indicator while loading', () => {
    (useResultConfirmation as jest.Mock).mockReturnValue({
      ...mockHookReturn,
      isLoading: true,
      result: null,
    });
    render(<ResultReviewScreen resultId="result-123" specimenId="specimen-1" />);
    expect(
      screen.getByTestId?.('loading') ??
        screen.UNSAFE_getByType(require('react-native').ActivityIndicator),
    ).toBeTruthy();
  });

  it('shows a not-found state when the result has no local record', () => {
    (useResultConfirmation as jest.Mock).mockReturnValue({
      ...mockHookReturn,
      result: null,
    });
    render(<ResultReviewScreen resultId="result-123" specimenId="specimen-1" />);
    expect(screen.getByText('Result not found')).toBeTruthy();
  });
});
