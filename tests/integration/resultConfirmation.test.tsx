// Path: urolens-mobile/tests/integration/resultConfirmation.test.tsx
// TASK-MOB-09-12: Integration test — ResultReviewScreen verifying component + hook +
// data layer work together without mocking the hook itself. Only system boundaries
// (DB, API, network status) are mocked.
//
// Mobile PR #55 review, #3: Confirm, Retake and Override all moved to the website —
// PENDING_CONFIRM and RETURNED_FOR_CORRECTION never reach this screen in production
// (SampleDetailScreen sends them to "Continue on the Website" instead), so every
// fixture here uses a status past the MedTech's own sign-off.

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { ResultReviewScreen } from '@features/result-confirmation/components/ResultReviewScreen';
import { database } from '@db/database';
import { apiClient } from '@lib/apiClient';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { ScrollView } from 'react-native';
import { router } from 'expo-router';

jest.mock('@lib/auth/authStore', () => ({ useUserId: () => 'medtech-int' }));

// ── System-boundary mocks only — useResultConfirmation is NOT mocked ──────────

jest.mock('@db/database', () => ({
  database: {
    get: jest.fn(),
    write: jest.fn((fn: () => Promise<void>) => fn()),
  },
}));

jest.mock('@lib/apiClient', () => ({
  __esModule: true,
  apiClient: { post: jest.fn(), get: jest.fn(), patch: jest.fn() },
}));

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(),
}));

jest.mock('@components/OfflineBanner', () => ({
  OfflineBanner: () => null,
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@db/sync/syncManager', () => ({
  synchronize: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Stack: { Screen: () => null },
}));

// ── Shared test data ──────────────────────────────────────────────────────────

const mockDetail = {
  resultId: 'result-int-01',
  specimenId: 'specimen-int-01',
  patientUid: 'PT-1',
  sampleUid: 'SMP-1',
  annotations: [],
  aiFindings: { rbc: 3, wbc: 14, bacteria: 2 },
  flaggedAnomalies: { wbc: true },
  status: 'PENDING_SUPERVISOR_APPROVAL',
  imageUrl: 'https://example.test/microscopy.jpg',
  smartDiagnosis: null,
  smartDiagnosisUnavailable: false,
};

const mockResult = {
  serverId: 'result-int-01',
  specimenId: 'specimen-int-01',
  status: 'PENDING_SUPERVISOR_APPROVAL',
  isSynced: true,
  smartDiagnosis: null,
  smartDiagnosisUnavailable: false,
  aiFindingsJson: JSON.stringify({ rbc: 3, wbc: 14, bacteria: 2 }),
  get aiFindings() {
    return JSON.parse(this.aiFindingsJson);
  },
};

function setupDatabaseMock(result = mockResult) {
  const mockObserve = jest.fn(() => ({
    subscribe: jest.fn((cb: (records: (typeof result)[]) => void) => {
      cb([result]);
      return { unsubscribe: jest.fn() };
    }),
  }));

  (database.get as jest.Mock).mockImplementation((table: string) => {
    if (table === 'analysis_results')
      return {
        query: jest.fn(() => ({ observeWithColumns: mockObserve })),
      };
    return {};
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setupDatabaseMock();
  mockResult.status = 'PENDING_SUPERVISOR_APPROVAL';
  mockResult.isSynced = true;
  (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
  (apiClient.get as jest.Mock).mockResolvedValue({ data: mockDetail });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ResultReviewScreen — integration (TASK-MOB-09-12)', () => {
  describe('read-only review', () => {
    async function openResult(): Promise<ReturnType<typeof render>> {
      const view = render(
        <ResultReviewScreen resultId="result-int-01" specimenId="specimen-int-01" />,
      );
      await waitFor(() => expect(view.getByLabelText('Microscopy image')).toBeTruthy());
      return view;
    }

    it('loads patient context, microscopy image and return reason', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: {
          ...mockDetail,
          status: 'RETURNED_FOR_CORRECTION',
          returnReason: 'Recount the casts',
        },
      });
      const view = await openResult();
      expect(view.getByText('Patient UID')).toBeTruthy();
      expect(view.getByText('PT-1')).toBeTruthy();
      expect(view.getByText('Sample ID')).toBeTruthy();
      expect(view.getByText('SMP-1')).toBeTruthy();
      expect(view.getByLabelText('Microscopy image').props.source.uri).toBe(mockDetail.imageUrl);
      expect(view.getByText('Recount the casts')).toBeTruthy();
      expect(view.queryByLabelText('Annotation notes')).toBeNull();
      expect(view.queryByText('Draw')).toBeNull();
      expect(view.queryByText('Save annotations')).toBeNull();
    });

    it('refreshes result details by pulling down without a reload link', async () => {
      const view = await openResult();
      expect(view.queryByText('Reload result details')).toBeNull();
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: { ...mockDetail, sampleUid: 'SMP-2' },
      });
      act(() => {
        view.UNSAFE_getByType(ScrollView).props.refreshControl.props.onRefresh();
      });
      await waitFor(() => expect(view.getByText('SMP-2')).toBeTruthy());
    });

    it.each([
      'PENDING_CONFIRM',
      'RETURNED_FOR_CORRECTION',
      'PENDING_SUPERVISOR_APPROVAL',
      'APPROVED',
      'RELEASED',
      'CRITICAL_ESCALATED',
    ])('offers no Confirm, Retake or Override for a %s result', async (status): Promise<void> => {
      (apiClient.get as jest.Mock).mockResolvedValue({ data: { ...mockDetail, status } });
      const view = await openResult();
      expect(view.queryByText('Confirm Result')).toBeNull();
      expect(view.queryByLabelText('Retake image')).toBeNull();
      expect(view.queryByText('Override')).toBeNull();
      expect(view.getByText('Continue')).toBeTruthy();
    });

    it('returns to the queue on Continue', async () => {
      const view = await openResult();
      fireEvent.press(view.getByText('Continue'));
      expect(router.replace).toHaveBeenCalledWith('/(medtech)/queue');
    });

    it('returns to the queue directly via the title bar back button', async () => {
      const view = await openResult();
      fireEvent.press(view.getByLabelText('Back to Confirmation Queue'));
      expect(router.replace).toHaveBeenCalledWith('/(medtech)/queue');
    });

    it('shows an unavailable message when the image cannot be loaded', async () => {
      const view = await openResult();
      fireEvent(view.getByLabelText('Microscopy image'), 'error');
      expect(view.getByText(/Microscopy image unavailable/)).toBeTruthy();
    });
  });

  describe('rendering', () => {
    it('renders the AI disclaimer as the first element', () => {
      render(<ResultReviewScreen resultId="result-int-01" specimenId="specimen-int-01" />);
      expect(screen.getByText(/UroLens is a clinical decision-support tool/i)).toBeTruthy();
    });

    it('renders particle findings derived from WatermelonDB ai_findings', () => {
      render(<ResultReviewScreen resultId="result-int-01" specimenId="specimen-int-01" />);
      expect(screen.getByText('rbc')).toBeTruthy();
      expect(screen.getByText('wbc')).toBeTruthy();
      expect(screen.getByText('bacteria')).toBeTruthy();
    });

    it('flags wbc as anomalous (count 14 > threshold 5)', () => {
      render(<ResultReviewScreen resultId="result-int-01" specimenId="specimen-int-01" />);
      expect(screen.getByText('Anomalous')).toBeTruthy();
    });
  });

  describe('smart diagnosis failure isolation', () => {
    it('does not revive cached diagnosis after the server reports failure', async (): Promise<void> => {
      setupDatabaseMock({
        ...mockResult,
        smartDiagnosis: {
          gout: { level: 'HIGH' },
          glomerulonephritis: { level: 'LOW' },
          nephrolithiasis: { level: 'LOW' },
          no_significant_indicators: false,
        },
      } as unknown as typeof mockResult);
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: {
          ...mockDetail,
          status: 'PENDING_SUPERVISOR_APPROVAL',
          smartDiagnosisUnavailable: true,
        },
      });
      const view = render(
        <ResultReviewScreen resultId="result-int-01" specimenId="specimen-int-01" />,
      );
      await waitFor(() => expect(view.getByText('Diagnosis unavailable')).toBeTruthy());
      expect(view.queryByLabelText('Gout: High')).toBeNull();
    });

    it('renders backend scores without supporting evidence, captioned "Supervisor review"', async (): Promise<void> => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: {
          ...mockDetail,
          smartDiagnosis: {
            goutScore: 'HIGH',
            gnScore: 'LOW',
            nephroScore: 'MODERATE',
            noSignificantIndicators: false,
            evidenceMap: {
              gout: {
                evidence: [
                  {
                    particle_name: 'crystals',
                    particle_display_name: 'Crystals',
                    detected_count: 60,
                    normal_range_max: 5,
                    contribution_role: 'primary',
                  },
                ],
              },
            },
          },
        },
      });
      const view = render(
        <ResultReviewScreen resultId="result-int-01" specimenId="specimen-int-01" />,
      );
      await waitFor(() => expect(view.getByLabelText('Gout: High')).toBeTruthy());
      expect(view.getByLabelText('Glomerulonephritis: Low')).toBeTruthy();
      expect(view.getByLabelText('Nephrolithiasis: Moderate')).toBeTruthy();
      expect(view.queryByText('Supporting evidence')).toBeNull();
      expect(view.queryByText(/reference maximum/)).toBeNull();
      expect(view.queryByText('Preview')).toBeNull();
      expect(view.getByText('Supervisor review')).toBeTruthy();
    });

    it('shows no indicators for a valid all-low detail response', async (): Promise<void> => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: {
          ...mockDetail,
          status: 'APPROVED',
          smartDiagnosis: {
            goutScore: 'LOW',
            gnScore: 'LOW',
            nephroScore: 'LOW',
            noSignificantIndicators: true,
          },
        },
      });
      const view = render(
        <ResultReviewScreen resultId="result-int-01" specimenId="specimen-int-01" />,
      );
      await waitFor(() =>
        expect(view.getByText('No significant diagnostic indicators found.')).toBeTruthy(),
      );
    });

    it('shows unavailable message when smartDiagnosisUnavailable=true', () => {
      setupDatabaseMock({ ...mockResult, smartDiagnosisUnavailable: true });
      render(<ResultReviewScreen resultId="result-int-01" specimenId="specimen-int-01" />);
      expect(screen.getByText(/Diagnosis unavailable/i)).toBeTruthy();
    });
  });
});
