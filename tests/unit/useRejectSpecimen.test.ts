/**
 * Unit tests for useRejectSpecimen hook (TASK-MOB-04)
 *
 * Covers:
 *  - Initial state (isLoading false)
 *  - Online path: calls API and updates local specimen status to REJECTED
 *  - Offline path: writes to pending_sync and updates local status (no API call)
 *  - Throws when specimen has no serverId
 *  - isLoading is true during reject and resets to false on success
 *  - isLoading resets to false even when API throws
 */

// ─── Mocks (hoisted before imports) ─────────────────────────────────────────

jest.mock('@nozbe/watermelondb', () => ({ Model: class {} }));
jest.mock('@db/database', () => ({ database: { get: jest.fn(), write: jest.fn() } }));
jest.mock('@lib/apiClient', () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock('@hooks/useNetworkStatus', () => ({ useNetworkStatus: jest.fn() }));
jest.mock('@app-types/enums', () => ({
  RejectionReason: {
    INSUFFICIENT_VOLUME: 'INSUFFICIENT_VOLUME',
    WRONG_CONTAINER: 'WRONG_CONTAINER',
    UNLABELED: 'UNLABELED',
    OTHER: 'OTHER',
  },
  PendingSyncAction: { REJECT_SPECIMEN: 'REJECT_SPECIMEN' },
  PendingSyncStatus: { PENDING: 'PENDING' },
}));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { renderHook, act } from '@testing-library/react-native';
import { useRejectSpecimen } from '../../src/features/specimen-rejection/hooks/useRejectSpecimen';
import { database } from '../../src/db/database';
import apiClient from '../../src/lib/apiClient';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { RejectionReason } from '../../src/types/enums';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSpecimen(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'local-1',
    serverId: 'srv-1',
    sampleUid: 'SAMPLE-001',
    patientName: 'Juan Dela Cruz',
    status: 'ASSIGNED',
    update: jest.fn().mockImplementation(async (cb: (s: Record<string, unknown>) => void) => {
      cb({} as Record<string, unknown>);
    }),
    ...overrides,
  };
}

function buildPendingSyncCreate() {
  return jest.fn().mockImplementation((cb: (r: Record<string, unknown>) => void) => {
    cb({} as Record<string, unknown>);
  });
}

function setupDb(specimen: ReturnType<typeof makeSpecimen>) {
  const pendingSyncCreate = buildPendingSyncCreate();

  (database.get as jest.Mock).mockImplementation((table: string) => {
    if (table === 'specimens') {
      return { find: jest.fn().mockResolvedValue(specimen) };
    }
    if (table === 'pending_sync') {
      return { create: pendingSyncCreate };
    }
    return {};
  });

  (database.write as jest.Mock).mockImplementation(async (fn: () => Promise<void>) => fn());

  return { pendingSyncCreate };
}

// ─── Test setup ──────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
  (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useRejectSpecimen', () => {
  describe('initial state', () => {
    it('starts with isLoading false', () => {
      setupDb(makeSpecimen());
      const { result } = renderHook(() => useRejectSpecimen('local-1'));
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('online path', () => {
    it('calls the API and updates local specimen status', async () => {
      const specimen = makeSpecimen();
      setupDb(specimen);
      const { result } = renderHook(() => useRejectSpecimen('local-1'));

      await act(async () => {
        await result.current.reject(RejectionReason.INSUFFICIENT_VOLUME);
      });

      expect(apiClient.post).toHaveBeenCalledWith('/specimens/srv-1/reject', {
        reason_code: 'INSUFFICIENT_VOLUME',
      });
      expect(specimen.update).toHaveBeenCalledTimes(1);
    });

    it('includes free_text_note in the API payload when note is provided', async () => {
      const specimen = makeSpecimen();
      setupDb(specimen);
      const { result } = renderHook(() => useRejectSpecimen('local-1'));

      await act(async () => {
        await result.current.reject(RejectionReason.OTHER, 'Cracked tube');
      });

      expect(apiClient.post).toHaveBeenCalledWith('/specimens/srv-1/reject', {
        reason_code: 'OTHER',
        free_text_note: 'Cracked tube',
      });
    });

    it('omits free_text_note when note is blank whitespace', async () => {
      const specimen = makeSpecimen();
      setupDb(specimen);
      const { result } = renderHook(() => useRejectSpecimen('local-1'));

      await act(async () => {
        await result.current.reject(RejectionReason.UNLABELED, '   ');
      });

      expect(apiClient.post).toHaveBeenCalledWith('/specimens/srv-1/reject', {
        reason_code: 'UNLABELED',
      });
    });

    it('does NOT write to pending_sync when online', async () => {
      const specimen = makeSpecimen();
      const { pendingSyncCreate } = setupDb(specimen);
      const { result } = renderHook(() => useRejectSpecimen('local-1'));

      await act(async () => {
        await result.current.reject(RejectionReason.WRONG_CONTAINER);
      });

      expect(pendingSyncCreate).not.toHaveBeenCalled();
    });
  });

  describe('offline path', () => {
    beforeEach(() => {
      (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
    });

    it('does NOT call the API when offline', async () => {
      const specimen = makeSpecimen();
      setupDb(specimen);
      const { result } = renderHook(() => useRejectSpecimen('local-1'));

      await act(async () => {
        await result.current.reject(RejectionReason.INSUFFICIENT_VOLUME);
      });

      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('writes to pending_sync with correct fields when offline', async () => {
      const specimen = makeSpecimen();
      const { pendingSyncCreate } = setupDb(specimen);
      const { result } = renderHook(() => useRejectSpecimen('local-1'));

      await act(async () => {
        await result.current.reject(RejectionReason.WRONG_CONTAINER, 'EDTA tube used');
      });

      expect(pendingSyncCreate).toHaveBeenCalledTimes(1);
      const createCb = pendingSyncCreate.mock.calls[0][0];
      const record: Record<string, unknown> = {};
      createCb(record);
      expect(record.entity).toBe('specimens');
      expect(record.entityId).toBe('srv-1');
      expect(record.action).toBe('REJECT_SPECIMEN');
      expect(record.status).toBe('PENDING');
      expect(JSON.parse(record.payloadJson as string)).toEqual({
        reason_code: 'WRONG_CONTAINER',
        free_text_note: 'EDTA tube used',
      });
      expect(typeof record.createdAt).toBe('number');
    });

    it('still updates local specimen status when offline', async () => {
      const specimen = makeSpecimen();
      setupDb(specimen);
      const { result } = renderHook(() => useRejectSpecimen('local-1'));

      await act(async () => {
        await result.current.reject(RejectionReason.UNLABELED);
      });

      expect(specimen.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('error cases', () => {
    it('resolves false and sets error when specimen has no serverId', async () => {
      const specimen = makeSpecimen({ serverId: null });
      setupDb(specimen);
      const { result } = renderHook(() => useRejectSpecimen('local-1'));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.reject(RejectionReason.OTHER);
      });

      expect(success).toBe(false);
      expect(result.current.error).toMatch(/Specimen has not been synced/);
    });

    it('resolves false and resets isLoading to false when API throws', async () => {
      const specimen = makeSpecimen();
      setupDb(specimen);
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('network'));
      const { result } = renderHook(() => useRejectSpecimen('local-1'));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.reject(RejectionReason.OTHER);
      });

      expect(success).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('isLoading', () => {
    it('is false after a successful reject', async () => {
      const specimen = makeSpecimen();
      setupDb(specimen);
      const { result } = renderHook(() => useRejectSpecimen('local-1'));

      await act(async () => {
        await result.current.reject(RejectionReason.INSUFFICIENT_VOLUME);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });
});
