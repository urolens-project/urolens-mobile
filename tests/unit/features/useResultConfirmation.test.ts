// Path: urolens-mobile/tests/unit/features/useResultConfirmation.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useResultConfirmation } from '@features/result-confirmation/hooks/useResultConfirmation';
import { database } from '@db/database';
import { apiClient } from '@lib/apiClient';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { PendingSyncAction, PendingSyncStatus } from '@/types/enums';

// --- Mocks ---
jest.mock('@db/database', () => ({
  database: {
    get: jest.fn(),
    write: jest.fn((fn: () => Promise<void>) => fn()),
  },
}));

jest.mock('@lib/apiClient', () => ({
  __esModule: true,
  apiClient: {
    post: jest.fn(),
  },
}));

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(),
}));

const mockObserve = jest.fn();
const mockQuery   = jest.fn(() => ({ observe: mockObserve }));
const mockCreate  = jest.fn();
const mockUpdate  = jest.fn();

const mockResult = {
  serverId: 'result-123',
  status: 'PENDING_REVIEW',
  aiFindingsJson: JSON.stringify({ rbc: 3, wbc: 12, bacteria: 1 }),
  smartDiagnosisJson: null,
  smartDiagnosisUnavailable: false,
  isConfirmed: false,
  get aiFindings() { return JSON.parse(this.aiFindingsJson); },
  update: mockUpdate,
};

const mockPendingSyncTable = { create: mockCreate };

beforeEach(() => {
  jest.clearAllMocks();
  (database.get as jest.Mock).mockImplementation((table: string) => {
    if (table === 'analysis_results') return { query: mockQuery };
    if (table === 'pending_sync')    return mockPendingSyncTable;
    return {};
  });
  mockObserve.mockReturnValue({ subscribe: (cb: Function) => { cb([mockResult]); return { unsubscribe: jest.fn() }; } });
  mockUpdate.mockImplementation(async (fn: Function) => fn(mockResult));
});

describe('useResultConfirmation', () => {
  describe('online path', () => {
    beforeEach(() => {
      (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { id: 'conf-1' } });
    });

    it('loads the result from WatermelonDB', () => {
      const { result } = renderHook(() => useResultConfirmation('result-123'));
      expect(result.current.result).toBe(mockResult);
      expect(result.current.isLoading).toBe(false);
    });

    it('derives aiFindings correctly with anomaly flags', () => {
      const { result } = renderHook(() => useResultConfirmation('result-123'));
      const findings = result.current.aiFindings;
      expect(findings).toHaveLength(3);
      expect(findings.find(f => f.parameter === 'wbc')?.isAnomalous).toBe(true);
      expect(findings.find(f => f.parameter === 'rbc')?.isAnomalous).toBe(false);
    });

    it('calls POST /results/{id}/confirm when online', async () => {
      const { result } = renderHook(() => useResultConfirmation('result-123'));
      await act(async () => { await result.current.confirmResult(); });
      expect(apiClient.post).toHaveBeenCalledWith('/results/result-123/confirm');
    });

    it('updates local status optimistically after confirm', async () => {
      const { result } = renderHook(() => useResultConfirmation('result-123'));
      await act(async () => { await result.current.confirmResult(); });
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('does not create a pending_sync row when online', async () => {
      const { result } = renderHook(() => useResultConfirmation('result-123'));
      await act(async () => { await result.current.confirmResult(); });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('sets error state when API call fails', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() => useResultConfirmation('result-123'));
      await act(async () => { await result.current.confirmResult(); });
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('offline path', () => {
    beforeEach(() => {
      (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    });

    it('does not call the API when offline', async () => {
      const { result } = renderHook(() => useResultConfirmation('result-123'));
      await act(async () => { await result.current.confirmResult(); });
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('creates a pending_sync row with CONFIRM_RESULT action', async () => {
      const { result } = renderHook(() => useResultConfirmation('result-123'));
      await act(async () => { await result.current.confirmResult(); });

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const createFn = mockCreate.mock.calls[0][0];
      const row: Record<string, unknown> = {};
      createFn(row);
      expect(row.action).toBe(PendingSyncAction.CONFIRM_RESULT);
      expect(row.status).toBe(PendingSyncStatus.PENDING);
      expect(row.entityId).toBe('result-123');
    });

    it('still updates local status optimistically when offline', async () => {
      const { result } = renderHook(() => useResultConfirmation('result-123'));
      await act(async () => { await result.current.confirmResult(); });
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('prevents double-submission while confirming', async () => {
      const { result } = renderHook(() => useResultConfirmation('result-123'));
      // Trigger two rapid calls
      await act(async () => {
        result.current.confirmResult();
        await result.current.confirmResult();
      });
      // Only one pending_sync row should be created
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });
  });
});