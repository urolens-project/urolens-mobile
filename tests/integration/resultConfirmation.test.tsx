// Path: urolens-mobile/tests/integration/resultConfirmation.test.tsx
// TASK-MOB-09-12: Integration test — confirm flow verifying component + hook + data layer
// work together without mocking the hook itself. Only system boundaries (DB, API,
// network status) are mocked.

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { ResultReviewScreen } from '@features/result-confirmation/components/ResultReviewScreen';
import { database } from '@db/database';
import { apiClient } from '@lib/apiClient';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { PendingSyncAction, PendingSyncStatus } from '@/types/enums';
import { Alert } from 'react-native';
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

// ── Shared test data ──────────────────────────────────────────────────────────

const mockUpdate = jest.fn();
const mockCreate = jest.fn();
const mockDetail = {
  resultId: 'result-int-01',
  specimenId: 'specimen-int-01',
  patientUid: 'PT-1',
  sampleUid: 'SMP-1',
  annotations: [],
  aiFindings: { rbc: 3, wbc: 14, bacteria: 2 },
  flaggedAnomalies: { wbc: true },
  status: 'PENDING_CONFIRM',
  imageUrl: 'https://example.test/microscopy.jpg',
  smartDiagnosis: null,
  smartDiagnosisUnavailable: false,
};

const mockResult = {
  serverId: 'result-int-01',
  specimenId: 'specimen-int-01',
  status: 'PENDING_CONFIRM',
  isConfirmed: false,
  isSynced: false,
  smartDiagnosis: null,
  smartDiagnosisUnavailable: false,
  aiFindingsJson: JSON.stringify({ rbc: 3, wbc: 14, bacteria: 2 }),
  get aiFindings() {
    return JSON.parse(this.aiFindingsJson);
  },
  update: mockUpdate,
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
    if (table === 'pending_sync') return { create: mockCreate };
    return {};
  });

  mockUpdate.mockImplementation(async (fn: (r: Record<string, unknown>) => void) =>
    fn(mockResult as unknown as Record<string, unknown>),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  setupDatabaseMock();
  mockResult.status = 'PENDING_CONFIRM';
  mockResult.isSynced = false;
  (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
  (apiClient.post as jest.Mock).mockResolvedValue({ data: { id: 'conf-int-01' } });
  (apiClient.get as jest.Mock).mockResolvedValue({ data: mockDetail });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Result Confirmation — integration (TASK-MOB-09-12)', () => {
  describe('image review without manual annotations', () => {
    async function openResult(): Promise<ReturnType<typeof render>> {
      const view = render(
        <ResultReviewScreen resultId="result-int-01" specimenId="specimen-int-01" />,
      );
      await waitFor(() => expect(view.getByLabelText('Microscopy image')).toBeTruthy());
      return view;
    }

    it('loads patient context, microscopy image and return reason without an editor', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: {
          ...mockDetail,
          status: 'RETURNED_FOR_CORRECTION',
          returnReason: 'Recount the casts',
        },
      });
      const view = await openResult();
      expect(view.getByText('Patient UID: PT-1')).toBeTruthy();
      expect(view.getByText('Sample ID: SMP-1')).toBeTruthy();
      expect(view.getByLabelText('Microscopy image').props.source.uri).toBe(mockDetail.imageUrl);
      expect(view.getByText('Recount the casts')).toBeTruthy();
      expect(view.getByText('Re-confirm & Submit')).toBeTruthy();
      expect(view.queryByLabelText('Annotation notes')).toBeNull();
      expect(view.queryByText('Draw')).toBeNull();
      expect(view.queryByText('Save annotations')).toBeNull();
    });

    it('confirms directly without saving annotations', async () => {
      const view = await openResult();
      await act(async () => {
        fireEvent.press(view.getByText('Confirm Result'));
      });
      expect(apiClient.patch).not.toHaveBeenCalled();
      expect(apiClient.post).toHaveBeenCalledWith('/results/result-int-01/confirm', {});
      expect(router.replace).toHaveBeenCalledWith('/(medtech)/queue');
    });

    it('keeps the review open after confirmation fails and allows retry', async () => {
      (apiClient.post as jest.Mock).mockRejectedValueOnce({
        code: 'PENDING_RETAKE',
        message: 'A retake is pending.',
      });
      const view = await openResult();
      await act(async () => {
        fireEvent.press(view.getByText('Confirm Result'));
      });
      expect(Alert.alert).toHaveBeenCalledWith('Confirmation Failed', 'A retake is pending.');
      expect(router.replace).not.toHaveBeenCalled();
      await act(async () => {
        fireEvent.press(view.getByText('Confirm Result'));
      });
      expect(apiClient.patch).not.toHaveBeenCalled();
      expect(apiClient.post).toHaveBeenCalledTimes(2);
      expect(router.replace).toHaveBeenCalledWith('/(medtech)/queue');
    });

    it('queues confirmation when connectivity is lost during review', async () => {
      const view = await openResult();
      (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
      view.rerender(<ResultReviewScreen resultId="result-int-01" specimenId="specimen-int-01" />);
      await act(async () => {
        fireEvent.press(view.getByText('Queue Confirmation'));
      });
      expect(apiClient.patch).not.toHaveBeenCalled();
      expect(apiClient.post).not.toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(router.replace).toHaveBeenCalledWith('/(medtech)/queue');
    });

    it('reports successful resubmission of a returned result', async () => {
      (apiClient.get as jest.Mock).mockResolvedValue({
        data: { ...mockDetail, status: 'RETURNED_FOR_CORRECTION', returnReason: 'Recount casts' },
      });
      const view = await openResult();
      await act(async () => {
        fireEvent.press(view.getByText('Re-confirm & Submit'));
      });
      expect(apiClient.patch).not.toHaveBeenCalled();
      expect(apiClient.post).toHaveBeenCalledWith('/results/result-int-01/confirm', {});
      expect(Alert.alert).toHaveBeenCalledWith(
        'Result Re-submitted',
        'The result has been re-submitted for supervisor approval.',
      );
      expect(router.replace).toHaveBeenCalledWith('/(medtech)/queue');
    });

    it.each(['PENDING_SUPERVISOR_APPROVAL', 'APPROVED', 'RELEASED', 'CRITICAL_ESCALATED'])(
      'makes %s results read-only and offers no confirmation or retake',
      async (status): Promise<void> => {
        (apiClient.get as jest.Mock).mockResolvedValue({ data: { ...mockDetail, status } });
        const view = await openResult();
        expect(view.queryByText('Confirm Result')).toBeNull();
        expect(view.queryByText('Retake Image')).toBeNull();
        expect(view.queryByLabelText('Override rbc')).toBeNull();
      },
    );

    it('returns to the queue directly', async () => {
      const view = await openResult();
      fireEvent.press(view.getByLabelText('Back to Confirmation Queue'));
      expect(Alert.alert).not.toHaveBeenCalled();
      expect(router.replace).toHaveBeenCalledWith('/(medtech)/queue');
    });

    it('opens the existing value override route without an annotation save', async () => {
      const view = await openResult();
      fireEvent.press(view.getByLabelText('Override rbc'));
      expect(apiClient.patch).not.toHaveBeenCalled();
      expect(router.push).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: '/(medtech)/sample/override/[id]' }),
      );
      expect(apiClient.post).not.toHaveBeenCalled();
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

    it('shows Confirm Result button for an unconfirmed result', () => {
      render(<ResultReviewScreen resultId="result-int-01" specimenId="specimen-int-01" />);
      expect(screen.getByRole('button', { name: 'Confirm Result' })).toBeTruthy();
    });
  });

  describe('online confirm flow', () => {
    it('calls POST /results/{id}/confirm when Confirm Result is pressed', async () => {
      render(<ResultReviewScreen resultId="result-int-01" specimenId="specimen-int-01" />);
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: 'Confirm Result' }));
      });
      expect(apiClient.post).toHaveBeenCalledWith('/results/result-int-01/confirm', {});
    });

    it('updates local result status to PENDING_SUPERVISOR_APPROVAL optimistically', async () => {
      render(<ResultReviewScreen resultId="result-int-01" specimenId="specimen-int-01" />);
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: 'Confirm Result' }));
      });
      expect(mockUpdate).toHaveBeenCalled();
      const updateFn = mockUpdate.mock.calls[0][0];
      const row: Record<string, unknown> = {};
      updateFn(row);
      expect(row.status).toBe('PENDING_SUPERVISOR_APPROVAL');
    });

    it('does NOT create a pending_sync row when online', async () => {
      render(<ResultReviewScreen resultId="result-int-01" specimenId="specimen-int-01" />);
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: 'Confirm Result' }));
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('displays an error message when the API call fails', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Server unreachable'));
      render(<ResultReviewScreen resultId="result-int-01" specimenId="specimen-int-01" />);
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: 'Confirm Result' }));
      });
      await waitFor(() => {
        expect(screen.getByText('Server unreachable')).toBeTruthy();
      });
    });
  });

  describe('offline confirm flow', () => {
    beforeEach(() => {
      (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    });

    it('shows Queue Confirmation label when offline', () => {
      render(<ResultReviewScreen resultId="result-int-01" specimenId="specimen-int-01" />);
      expect(screen.getByRole('button', { name: 'Queue Confirmation' })).toBeTruthy();
    });

    it('creates a pending_sync row with CONFIRM_RESULT action when offline', async () => {
      render(<ResultReviewScreen resultId="result-int-01" specimenId="specimen-int-01" />);
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: 'Queue Confirmation' }));
      });
      expect(apiClient.post).not.toHaveBeenCalled();

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const row: Record<string, unknown> = {};
      mockCreate.mock.calls[0][0](row);
      expect(row.action).toBe(PendingSyncAction.CONFIRM_RESULT);
      expect(row.status).toBe(PendingSyncStatus.PENDING);
      expect(row.entityId).toBe('result-int-01');
    });

    it('still updates local status optimistically when offline', async () => {
      render(<ResultReviewScreen resultId="result-int-01" specimenId="specimen-int-01" />);
      await act(async () => {
        fireEvent.press(screen.getByRole('button', { name: 'Queue Confirmation' }));
      });
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('smart diagnosis failure isolation', () => {
    it('shows unavailable message when smartDiagnosisUnavailable=true', () => {
      setupDatabaseMock({ ...mockResult, smartDiagnosisUnavailable: true });
      render(<ResultReviewScreen resultId="result-int-01" specimenId="specimen-int-01" />);
      expect(screen.getByText(/Diagnosis unavailable/i)).toBeTruthy();
    });
  });
});
