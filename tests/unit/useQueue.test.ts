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
    where: jest.fn((field: string, value: unknown) => ({ _type: 'where', field, value })),
    oneOf: jest.fn((vals: unknown[]) => ({ _type: 'oneOf', vals })),
    gte: jest.fn((v: unknown) => ({ _type: 'gte', v })),
    lte: jest.fn((v: unknown) => ({ _type: 'lte', v })),
    sortBy: jest.fn((field: string, dir: string) => ({ _type: 'sortBy', field, dir })),
    asc: 'asc',
    desc: 'desc',
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

/**
 * The hook sets up two WatermelonDB subscriptions:
 *  1. filtered items (re-subscribes when filter changes)
 *  2. allItems totals (subscribes once on mount)
 *
 * We track them by subscribe-call order so tests can emit to the right one.
 */
let emitItems: (specimens: ReturnType<typeof makeSpecimen>[]) => void;
const mockUnsubscribe = jest.fn();
let subscribeCallCount = 0;
let capturedQuery: jest.Mock;

function buildDbChain() {
  subscribeCallCount = 0;
  const mockSubscribe = jest.fn().mockImplementation(
    (cb: (s: ReturnType<typeof makeSpecimen>[]) => void) => {
      subscribeCallCount += 1;
      if (subscribeCallCount === 1) emitItems = cb; // filter subscription
      // 2nd call is allItems — no need to emit to it in these tests
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
  subscribeCallCount = 0;
  const { mockGet, mockQuery } = buildDbChain();
  capturedQuery = mockQuery;
  (database.get as jest.Mock).mockImplementation(mockGet);
  (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
  (synchronize as jest.Mock).mockResolvedValue(undefined);
});

/** Returns the clauses array passed to the most recent .query(...clauses) call
 * on the *filter* subscription (the first .get('specimens') call each render —
 * the allItems subscription is the second and always uses the fixed base clause). */
function lastFilterQueryClauses(): Array<Record<string, unknown>> {
  const calls = capturedQuery.mock.calls;
  return calls[calls.length - 1] as unknown as Array<Record<string, unknown>>;
}

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
        emitItems([makeSpecimen()]);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.items).toHaveLength(1);
    });

    it('maps specimen fields to QueueItem correctly', async () => {
      const { result } = renderHook(() => useQueue());

      await act(async () => {
        emitItems([
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
        emitItems([makeSpecimen({ id: 'spec-1' })]);
      });
      expect(result.current.items).toHaveLength(1);

      await act(async () => {
        emitItems([
          makeSpecimen({ id: 'spec-1' }),
          makeSpecimen({ id: 'spec-2', sampleUid: 'SAMPLE-002' }),
        ]);
      });
      expect(result.current.items).toHaveLength(2);
    });

    it('unsubscribes from WatermelonDB when the component unmounts', () => {
      const { unmount } = renderHook(() => useQueue());
      unmount();
      // Two subscriptions (filtered items + allItems) are both cleaned up
      expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
    });
  });

  // QUEUE-02 / QUEUE-07 — empty-queue state (mvp-tier1-test-cases.md §2).
  // The hook has no notion of "never synced" vs. "synced but genuinely
  // empty" — both surface identically as an empty WatermelonDB emission, so
  // one test covers both IDs; this is confirmed-by-design, not a gap.
  describe('empty queue (QUEUE-02 / QUEUE-07)', () => {
    it('renders an empty list without error when the DB emits no specimens', async () => {
      const { result } = renderHook(() => useQueue());

      await act(async () => {
        emitItems([]);
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.items).toEqual([]);
    });
  });

  // QUEUE-06 — a specimen that moves out of ASSIGNED/IN_QUEUE elsewhere
  // (confirmed, rejected, etc.) should disappear from the queue on the next
  // reactive emission, without a manual refresh.
  describe('reactive status changes (QUEUE-06)', () => {
    it('drops a specimen from the list once it leaves ASSIGNED/IN_QUEUE', async () => {
      const { result } = renderHook(() => useQueue());

      await act(async () => {
        emitItems([
          makeSpecimen({ id: 'spec-1', status: 'ASSIGNED' }),
          makeSpecimen({ id: 'spec-2', status: 'IN_QUEUE' }),
        ]);
      });
      expect(result.current.items.map((i) => i.id)).toEqual(['spec-1', 'spec-2']);

      // WatermelonDB's reactive query re-emits with spec-1 excluded once its
      // status moves past ASSIGNED/IN_QUEUE (e.g. confirmed or rejected).
      await act(async () => {
        emitItems([makeSpecimen({ id: 'spec-2', status: 'IN_QUEUE' })]);
      });

      expect(result.current.items.map((i) => i.id)).toEqual(['spec-2']);
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

      // Filter subscription cleaned up; allItems subscription stays
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
      // mount: 2 (filter + allItems), setFilter: +1 = 3 total
      expect(database.get).toHaveBeenCalledTimes(3);
    });
  });

  // QUEUE-03 / QUEUE-04 / QUEUE-05 — verifies buildQuery() produces the
  // correct WatermelonDB clauses per filter, not just that state updates.
  // Q.sortBy/Q.gte/Q.lte were previously unmocked, so DATE/LATEST/EARLIEST
  // would have thrown "not a function" if exercised — this closes that gap.
  describe('filter query construction (QUEUE-03 / QUEUE-04 / QUEUE-05)', () => {
    it('QUEUE-03: DATE filter scopes to today via received_at gte/lte and sorts desc', () => {
      const { result } = renderHook(() => useQueue());

      act(() => {
        result.current.setFilter('DATE');
      });

      const clauses = lastFilterQueryClauses();
      expect(clauses).toHaveLength(4);
      expect(clauses[0]).toMatchObject({ _type: 'where', field: 'status' });
      expect(clauses[1]).toMatchObject({ _type: 'where', field: 'received_at' });
      expect((clauses[1] as any).value).toMatchObject({ _type: 'gte' });
      expect(clauses[2]).toMatchObject({ _type: 'where', field: 'received_at' });
      expect((clauses[2] as any).value).toMatchObject({ _type: 'lte' });
      expect(clauses[3]).toMatchObject({ _type: 'sortBy', field: 'received_at', dir: 'desc' });

      // Bounds are today's start/end, not an arbitrary window
      const start = new Date((clauses[1] as any).value.v);
      const end = new Date((clauses[2] as any).value.v);
      const now = new Date();
      expect(start.getDate()).toBe(now.getDate());
      expect(start.getHours()).toBe(0);
      expect(end.getHours()).toBe(23);
    });

    it.each<[FilterOption, string]>([
      ['HIGH', 'HIGH'],
      ['NORMAL', 'NORMAL'],
      ['LOW', 'LOW'],
      ['ROUTINE', 'ROUTINE'],
    ])('QUEUE-04: %s filter scopes to priority_level = %s only', (option, expected) => {
      const { result } = renderHook(() => useQueue());

      act(() => {
        result.current.setFilter(option);
      });

      const clauses = lastFilterQueryClauses();
      expect(clauses).toHaveLength(2);
      expect(clauses[0]).toMatchObject({ _type: 'where', field: 'status' });
      expect(clauses[1]).toMatchObject({ _type: 'where', field: 'priority_level', value: expected });
    });

    it('QUEUE-05: LATEST sorts received_at desc, EARLIEST sorts asc — same base filter otherwise', () => {
      const { result } = renderHook(() => useQueue());

      act(() => {
        result.current.setFilter('LATEST');
      });
      let clauses = lastFilterQueryClauses();
      expect(clauses).toHaveLength(2);
      expect(clauses[1]).toMatchObject({ _type: 'sortBy', field: 'received_at', dir: 'desc' });

      act(() => {
        result.current.setFilter('EARLIEST');
      });
      clauses = lastFilterQueryClauses();
      expect(clauses).toHaveLength(2);
      expect(clauses[1]).toMatchObject({ _type: 'sortBy', field: 'received_at', dir: 'asc' });
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
