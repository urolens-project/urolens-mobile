/**
 * Unit tests for useQueue hook (TASK-MOB-05-6)
 *
 * Covers:
 *  - Initial loading state
 *  - Items populated from WatermelonDB subscription
 *  - Each filter option triggers a new DB query
 *  - Sync triggered on mount when online; skipped when offline
 *  - refresh() calls synchronize and manages isRefreshing
 *  - refresh() is a no-op when offline
 *  - Subscription is cleaned up on unmount
 */

// ─── Mocks (hoisted before imports) ─────────────────────────────────────────

jest.mock('@nozbe/watermelondb', () => ({
  Q: {
    where: jest.fn(() => ({ _type: 'where' })),
    oneOf: jest.fn((vals: unknown[]) => ({ _type: 'oneOf', vals })),
  },
  Model: class {},
}));

jest.mock('@db/database', () => ({ database: { get: jest.fn() } }));
jest.mock('@db/sync/syncManager', () => ({ synchronize: jest.fn() }));
jest.mock('@hooks/useNetworkStatus', () => ({ useNetworkStatus: jest.fn() }));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { renderHook, act } from '@testing-library/react-native';
import { useQueue } from '../../src/features/queue/hooks/useQueue';
import { database } from '../../src/db/database';
import { synchronize } from '../../src/db/sync/syncManager';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import type { FilterOption } from '../../src/features/queue/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Minimal Specimen shape that satisfies specimenToQueueItem */
function makeSpecimen(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'spec-1',
    serverId: 'srv-1',
    sampleUid: 'SAMPLE-001',
    patientName: 'Juan Dela Cruz',
    patientUid: 'PT-001',
    testType: 'Urinalysis',
    status: 'ASSIGNED',
    priorityLevel: 'HIGH',
    receivedAt: '2026-05-22T10:00:00Z',
    medtechId: 'mt-1',
    syncedAt: null,
    ...overrides,
  };
}

// ─── Test setup ──────────────────────────────────────────────────────────────

/** Captures the subscriber callback so tests can push data into the hook */
let emitSpecimens: (specimens: ReturnType<typeof makeSpecimen>[]) => void;
const mockUnsubscribe = jest.fn();

function buildDbChain() {
  const mockSubscribe = jest.fn().mockImplementation(
    (cb: (s: ReturnType<typeof makeSpecimen>[]) => void) => {
      emitSpecimens = cb;
      return { unsubscribe: mockUnsubscribe };
    },
  );
  const mockObserve = jest.fn(() => ({ subscribe: mockSubscribe }));
  const mockQuery = jest.fn(() => ({ observe: mockObserve }));
  const mockGet = jest.fn(() => ({ query: mockQuery }));
  return { mockGet, mockQuery, mockObserve, mockSubscribe };
}

beforeEach(() => {
  jest.clearAllMocks();
  const { mockGet } = buildDbChain();
  (database.get as jest.Mock).mockImplementation(mockGet);
  (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
  (synchronize as jest.Mock).mockResolvedValue(undefined);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useQueue', () => {
  describe('initial state', () => {
    it('starts with isLoading true and an empty item list', () => {
      const { result } = renderHook(() => useQueue());
      expect(result.current.isLoading).toBe(true);
      expect(result.current.items).toEqual([]);
    });

    it('defaults filter to ALL', () => {
      const { result } = renderHook(() => useQueue());
      expect(result.current.filter).toBe('ALL');
    });

    it('starts with isRefreshing false', () => {
      const { result } = renderHook(() => useQueue());
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  describe('WatermelonDB subscription', () => {
    it('populates items and clears isLoading when the DB emits specimens', async () => {
      const { result } = renderHook(() => useQueue());

      await act(async () => {
        emitSpecimens([makeSpecimen()]);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.items).toHaveLength(1);
    });

    it('maps specimen fields to QueueItem correctly', async () => {
      const { result } = renderHook(() => useQueue());

      await act(async () => {
        emitSpecimens([
          makeSpecimen({
            id: 'spec-42',
            sampleUid: 'SAMPLE-042',
            patientName: 'Maria Santos',
            status: 'IN_QUEUE',
            priorityLevel: 'NORMAL',
          }),
        ]);
      });

      const item = result.current.items[0];
      expect(item.id).toBe('spec-42');
      expect(item.sampleUid).toBe('SAMPLE-042');
      expect(item.patientName).toBe('Maria Santos');
      expect(item.status).toBe('IN_QUEUE');
      expect(item.priorityLevel).toBe('NORMAL');
    });

    it('replaces items when the DB emits again', async () => {
      const { result } = renderHook(() => useQueue());

      await act(async () => {
        emitSpecimens([makeSpecimen({ id: 'spec-1' })]);
      });
      expect(result.current.items).toHaveLength(1);

      await act(async () => {
        emitSpecimens([
          makeSpecimen({ id: 'spec-1' }),
          makeSpecimen({ id: 'spec-2', sampleUid: 'SAMPLE-002' }),
        ]);
      });
      expect(result.current.items).toHaveLength(2);
    });

    it('unsubscribes from WatermelonDB when the component unmounts', () => {
      const { unmount } = renderHook(() => useQueue());
      unmount();
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  describe('filter changes', () => {
    it.each<FilterOption>(['ALL', 'HIGH', 'NORMAL', 'ASSIGNED', 'PROCESSING'])(
      'setFilter("%s") updates the filter state',
      async (option) => {
        const { result } = renderHook(() => useQueue());

        act(() => {
          result.current.setFilter(option);
        });

        expect(result.current.filter).toBe(option);
      },
    );

    it('re-subscribes to WatermelonDB when filter changes', () => {
      const { result } = renderHook(() => useQueue());
      // Initial subscription is 1
      expect(mockUnsubscribe).not.toHaveBeenCalled();

      act(() => {
        result.current.setFilter('HIGH');
      });

      // Old subscription should be cleaned up and a new one started
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
      expect(database.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('sync on mount', () => {
    it('calls synchronize once on mount when online', () => {
      renderHook(() => useQueue());
      expect(synchronize).toHaveBeenCalledTimes(1);
    });

    it('does NOT call synchronize on mount when offline', () => {
      (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
      renderHook(() => useQueue());
      expect(synchronize).not.toHaveBeenCalled();
    });
  });

  describe('refresh()', () => {
    it('calls synchronize and resets isRefreshing when online', async () => {
      const { result } = renderHook(() => useQueue());

      await act(async () => {
        await result.current.refresh();
      });

      // synchronize called: once on mount + once from refresh
      expect(synchronize).toHaveBeenCalledTimes(2);
      expect(result.current.isRefreshing).toBe(false);
    });

    it('does nothing when offline', async () => {
      (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: false });
      const { result } = renderHook(() => useQueue());

      await act(async () => {
        await result.current.refresh();
      });

      expect(synchronize).not.toHaveBeenCalled();
      expect(result.current.isRefreshing).toBe(false);
    });

    it('resets isRefreshing to false even if synchronize throws', async () => {
      // Mount call resolves; only the refresh call rejects
      let callCount = 0;
      (synchronize as jest.Mock).mockImplementation(() => {
        callCount += 1;
        return callCount === 1 ? Promise.resolve() : Promise.reject(new Error('network'));
      });

      const { result } = renderHook(() => useQueue());

      await act(async () => {
        // refresh() re-throws — catch so the test itself doesn't fail
        await result.current.refresh().catch(() => {});
      });

      expect(result.current.isRefreshing).toBe(false);
    });
  });
});
