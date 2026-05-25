// Path: urolens-mobile/tests/unit/features/useManualOverride.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useManualOverride } from '@features/manual-override/hooks/useManualOverride';
import { database } from '@db/database';
import { apiClient } from '@lib/apiClient';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { PendingSyncAction, PendingSyncStatus } from '@/types/enums';

jest.mock('@db/database', () => ({
  database: {
    get: jest.fn(),
    write: jest.fn((fn: () => Promise<void>) => fn()),
  },
}));

jest.mock('@lib/apiClient', () => ({
  apiClient: { post: jest.fn() },
}));

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(),
}));

jest.mock('@lib/auth/authStore', () => ({
  authStore: { getState: () => ({ userId: 'user-456' }) },
}));

const mockCreate = jest.fn();
const mockFetch  = jest.fn().mockResolvedValue([
  {
    serverId: 'result-123',
    aiFindings: { rbc: 3, wbc: 12 },
  },
]);

beforeEach(() => {
  jest.clearAllMocks();
  (database.get as jest.Mock).mockImplementation((table: string) => {
    if (table === 'analysis_results') return { query: () => ({ fetch: mockFetch }) };
    if (table === 'manual_overrides') return { create: mockCreate };
    if (table === 'pending_sync')     return { create: mockCreate };
    return {};
  });
});

const payload = {
  parameter: 'wbc',
  correctedValue: 8,
  rationale: 'Recount showed lower value under higher magnification',
};

describe('useManualOverride', () => {
  describe('online path', () => {
    beforeEach(() => {
      (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
      (apiClient.post as jest.Mock).mockResolvedValue({ data: { id: 'ov-1' } });
    });

    it('calls POST /results/{id}/override with correct payload', async () => {
      const { result } = renderHook(() => useManualOverride());
      await act(async () => { await result.current.submitOverride('result-123', payload); });

      expect(apiClient.post).toHaveBeenCalledWith(
        '/results/result-123/override',
        { parameter: 'wbc', corrected_value: 8, rationale: payload.rationale },
      );
    });

    it('writes a local ManualOverride record with is_synced=true', async () => {
      const { result } = renderHook(() => useManualOverride());
      await act(async () => { await result.current.submitOverride('result-123', payload); });

      const createFn = mockCreate.mock.calls[0][0];
      const row: Record<string, unknown> = {};
      createFn(row);
      expect(row.isSynced).toBe(true);
      expect(row.correctedValue).toBe(8);
      expect(row.originalAiValue).toBe(12); // from mockFetch aiFindings.wbc
    });

    it('preserves originalAiValue from local WatermelonDB', async () => {
      const { result } = renderHook(() => useManualOverride());
      await act(async () => { await result.current.submitOverride('result-123', payload); });

      const createFn = mockCreate.mock.calls[0][0];
      const row: Record<string, unknown> = {};
      createFn(row);
      // AI value for wbc was 12 — must be preserved, never overwritten
      expect(row.originalAiValue).toBe(12);
      expect(row.correctedValue).toBe(8);
    });

    it('sets error when API fails', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Server error'));
      const { result } = renderHook(() => useManualOverride());
      await act(async () => { await result.current.submitOverride('result-123', payload); });
      expect(result.current.error).toBe('Server error');
    });
  });

  describe('offline path', () => {
    beforeEach(() => {
      (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    });

    it('does not call the API when offline', async () => {
      const { result } = renderHook(() => useManualOverride());
      await act(async () => { await result.current.submitOverride('result-123', payload); });
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('creates pending_sync row with OVERRIDE_PARAMETER action', async () => {
      const { result } = renderHook(() => useManualOverride());
      await act(async () => { await result.current.submitOverride('result-123', payload); });

      // Find the pending_sync create call (second call — first is ManualOverride)
      const syncCreateCall = mockCreate.mock.calls.find((call) => {
        const row: Record<string, unknown> = {};
        call[0](row);
        return row.action === PendingSyncAction.OVERRIDE_PARAMETER;
      });
      expect(syncCreateCall).toBeDefined();

      const row: Record<string, unknown> = {};
      syncCreateCall![0](row);
      expect(row.status).toBe(PendingSyncStatus.PENDING);
      expect(row.entity).toBe('manual_override');
    });

    it('writes local ManualOverride with is_synced=false', async () => {
      const { result } = renderHook(() => useManualOverride());
      await act(async () => { await result.current.submitOverride('result-123', payload); });

      // First create call is the ManualOverride
      const overrideCreateCall = mockCreate.mock.calls[0];
      const row: Record<string, unknown> = {};
      overrideCreateCall[0](row);
      // is_synced=false triggers CLIENT_WINS in conflictResolver
      expect(row.isSynced).toBe(false);
    });
  });
});