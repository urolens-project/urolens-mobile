// Path: urolens-mobile/tests/integration/manualOverride.test.ts
// TASK-MOB-10-8: Integration test — override stored with original AI value preserved,
// offline path creates both local record and pending_sync row.
// Tests useManualOverride hook with real implementation against mocked DB/API boundaries.

import { renderHook, act } from '@testing-library/react-native';
import { useManualOverride } from '@features/manual-override/hooks/useManualOverride';
import { database } from '@db/database';
import { apiClient } from '@lib/apiClient';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { PendingSyncAction, PendingSyncStatus } from '@/types/enums';

// ── System-boundary mocks only ────────────────────────────────────────────────

jest.mock('@db/database', () => ({
  database: {
    get: jest.fn(),
    write: jest.fn((fn: () => Promise<void>) => fn()),
  },
}));

jest.mock('@lib/apiClient', () => ({
  __esModule: true,
  apiClient: { post: jest.fn() },
}));

jest.mock('@hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(),
}));

jest.mock('@lib/auth/authStore', () => ({
  useAuthStore: { getState: () => ({ userId: 'medtech-int-01' }) },
}));

// ── Test fixtures ─────────────────────────────────────────────────────────────

const mockOverrideCreate   = jest.fn();
const mockPendingSyncCreate = jest.fn();

// Simulated WatermelonDB result record with known ai_findings
const mockAnalysisResult = {
  serverId:       'result-int-02',
  aiFindingsJson: JSON.stringify({ rbc: 4, wbc: 18, epithelial: 6 }),
  get aiFindings() { return JSON.parse(this.aiFindingsJson); },
};

beforeEach(() => {
  jest.clearAllMocks();

  (database.get as jest.Mock).mockImplementation((table: string) => {
    if (table === 'analysis_results') {
      return {
        query: jest.fn(() => ({
          fetch: jest.fn().mockResolvedValue([mockAnalysisResult]),
        })),
      };
    }
    if (table === 'manual_overrides') return { create: mockOverrideCreate };
    if (table === 'pending_sync')     return { create: mockPendingSyncCreate };
    return {};
  });

  (apiClient.post as jest.Mock).mockResolvedValue({ data: { id: 'ov-int-01' } });
  (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
});

// ── Helper ────────────────────────────────────────────────────────────────────

function extractRow(mockFn: jest.Mock, callIndex = 0): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  mockFn.mock.calls[callIndex][0](row);
  return row;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Manual Override — integration (TASK-MOB-10-8)', () => {
  const resultId = 'result-int-02';
  const wbcPayload = {
    parameter:      'wbc',
    correctedValue: 10,
    rationale:      'Re-examined under 40× — count was lower than AI estimated.',
  };

  describe('online path', () => {
    it('calls POST /results/{id}/override with correct snake_case payload', async () => {
      const { result } = renderHook(() => useManualOverride());
      await act(async () => {
        await result.current.submitOverride(resultId, wbcPayload);
      });

      expect(apiClient.post).toHaveBeenCalledWith(
        `/results/${resultId}/override`,
        {
          parameter:       'wbc',
          corrected_value: 10,
          rationale:       wbcPayload.rationale,
        },
      );
    });

    it('creates a local ManualOverride record with is_synced=true', async () => {
      const { result } = renderHook(() => useManualOverride());
      await act(async () => {
        await result.current.submitOverride(resultId, wbcPayload);
      });

      const row = extractRow(mockOverrideCreate);
      expect(row.isSynced).toBe(true);
    });

    it('preserves the original AI value for wbc (18) — never overwrites it', async () => {
      const { result } = renderHook(() => useManualOverride());
      await act(async () => {
        await result.current.submitOverride(resultId, wbcPayload);
      });

      const row = extractRow(mockOverrideCreate);
      // AI had wbc=18; MedTech corrects to 10 — both must be stored separately
      expect(row.originalAiValue).toBe(18);
      expect(row.correctedValue).toBe(10);
    });

    it('stores the overriding MedTech user ID', async () => {
      const { result } = renderHook(() => useManualOverride());
      await act(async () => {
        await result.current.submitOverride(resultId, wbcPayload);
      });

      const row = extractRow(mockOverrideCreate);
      expect(row.overriddenBy).toBe('medtech-int-01');
    });

    it('stores the parameter name and rationale', async () => {
      const { result } = renderHook(() => useManualOverride());
      await act(async () => {
        await result.current.submitOverride(resultId, wbcPayload);
      });

      const row = extractRow(mockOverrideCreate);
      expect(row.parameter).toBe('wbc');
      expect(row.rationale).toBe(wbcPayload.rationale);
    });

    it('does NOT create a pending_sync row when online', async () => {
      const { result } = renderHook(() => useManualOverride());
      await act(async () => {
        await result.current.submitOverride(resultId, wbcPayload);
      });

      expect(mockPendingSyncCreate).not.toHaveBeenCalled();
    });

    it('sets error state when API call fails', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Gateway timeout'));
      const { result } = renderHook(() => useManualOverride());
      await act(async () => {
        await result.current.submitOverride(resultId, wbcPayload);
      });

      expect(result.current.error).toBe('Gateway timeout');
    });
  });

  describe('offline path', () => {
    beforeEach(() => {
      (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    });

    it('does not call the API when offline', async () => {
      const { result } = renderHook(() => useManualOverride());
      await act(async () => {
        await result.current.submitOverride(resultId, wbcPayload);
      });

      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('creates a local ManualOverride record with is_synced=false', async () => {
      const { result } = renderHook(() => useManualOverride());
      await act(async () => {
        await result.current.submitOverride(resultId, wbcPayload);
      });

      const row = extractRow(mockOverrideCreate);
      expect(row.isSynced).toBe(false);
    });

    it('still preserves the original AI value when offline', async () => {
      const { result } = renderHook(() => useManualOverride());
      await act(async () => {
        await result.current.submitOverride(resultId, wbcPayload);
      });

      const row = extractRow(mockOverrideCreate);
      expect(row.originalAiValue).toBe(18);
      expect(row.correctedValue).toBe(10);
    });

    it('creates a pending_sync row with OVERRIDE_PARAMETER action', async () => {
      const { result } = renderHook(() => useManualOverride());
      await act(async () => {
        await result.current.submitOverride(resultId, wbcPayload);
      });

      const syncRow = extractRow(mockPendingSyncCreate);
      expect(syncRow.action).toBe(PendingSyncAction.OVERRIDE_PARAMETER);
      expect(syncRow.status).toBe(PendingSyncStatus.PENDING);
      expect(syncRow.entityId).toBe(resultId);
    });

    it('includes the full payload in the pending_sync payloadJson', async () => {
      const { result } = renderHook(() => useManualOverride());
      await act(async () => {
        await result.current.submitOverride(resultId, wbcPayload);
      });

      const syncRow = extractRow(mockPendingSyncCreate);
      const payload = JSON.parse(syncRow.payloadJson as string);
      expect(payload.parameter).toBe('wbc');
      expect(payload.correctedValue).toBe(10);
    });
  });

});
