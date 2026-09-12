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
    or: jest.fn((...clauses: unknown[]) => ({ _type: 'or', clauses })),
    asc: 'asc',
    desc: 'desc',
  },
  Model: class {},
}));

jest.mock('@db/database', () => ({ database: { get: jest.fn() } }));
jest.mock('@db/sync/syncManager', () => ({
  synchronize: jest.fn(),
  LAST_SYNC_KEY: 'urolens_last_sync_at',
}));
jest.mock('@hooks/useNetworkStatus', () => ({ useNetworkStatus: jest.fn() }));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueue } from '../../src/features/queue/hooks/useQueue';
import { database } from '../../src/db/database';
import { synchronize, LAST_SYNC_KEY } from '../../src/db/sync/syncManager';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import type { FilterOption } from '../../src/features/queue/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Minimal Specimen shape that satisfies specimenToQueueItem.
 *
 * serverId defaults to a value derived from id (not a fixed 'srv-1') so
 * that two calls with different ids and no explicit serverId are never
 * accidentally treated as duplicates of the same server record by
 * useQueue's dedupeQueueItems — pass `id` and this stays unique for free;
 * override `serverId` explicitly only when a test wants to simulate an
 * actual duplicate (same serverId, different local id).
 */
function makeSpecimen(overrides: Partial<Record<string, unknown>> = {}) {
  const id = (overrides.id as string | undefined) ?? 'spec-1';
  return {
    id,
    serverId: `srv-${id}`,
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
 * The hook sets up three WatermelonDB subscriptions, in this fixed order:
 *  0. filtered items (re-subscribes whenever filter or returnedServerIds change)
 *  1. allItems totals (re-subscribes whenever returnedServerIds changes)
 *  2. returned-for-correction tracking (subscribes once on mount, never re-fires)
 *
 * We track every subscribe() call in creation order — index 2 is always the
 * returned-tracking subscription (it never tears down/recreates), but indices
 * 0/1 shift once returnedServerIds changes and 0/1 re-subscribe. Tests that
 * only care about the initial mount can use emitItems(); tests that drive a
 * returnedServerIds-triggered re-subscription read the tail of the array directly.
 */
const subscribeCalls: Array<{ cb: (rows: unknown[]) => void }> = [];
const mockUnsubscribe = jest.fn();
let capturedQuery: jest.Mock;

function emitItems(specimens: ReturnType<typeof makeSpecimen>[]) {
  subscribeCalls[0]?.cb(specimens);
}

function emitReturnedResults(results: Array<{ specimenId: string }>) {
  subscribeCalls[2]?.cb(results);
}

function buildDbChain() {
  subscribeCalls.length = 0;
  const mockSubscribe = jest.fn().mockImplementation((cb: (rows: unknown[]) => void) => {
    subscribeCalls.push({ cb });
    return { unsubscribe: mockUnsubscribe };
  });
  const mockObserve = jest.fn(() => ({ subscribe: mockSubscribe }));
  const mockQuery = jest.fn(() => ({ observe: mockObserve }));
  const mockGet = jest.fn(() => ({ query: mockQuery }));
  return { mockGet, mockQuery, mockObserve, mockSubscribe };
}

beforeEach(() => {
  jest.clearAllMocks();
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
      // Three subscriptions (filtered items + allItems + returned-for-correction
      // tracking) are all cleaned up
      expect(mockUnsubscribe).toHaveBeenCalledTimes(3);
    });
  });

  // Regression: a past sync bug could leave two local specimen rows for the
  // same server record (see db/sync/dedupeByServerId.ts, which now cleans
  // this up on every sync). Until that next sync runs, the Queue must not
  // show the same patient/sample twice.
  describe('duplicate-specimen display safety net', () => {
    it('collapses two local rows that share a server_id into a single card', async () => {
      const { result } = renderHook(() => useQueue());

      await act(async () => {
        emitItems([
          makeSpecimen({ id: 'local-old', serverId: 'srv-1', status: 'ASSIGNED' }),
          makeSpecimen({ id: 'local-new', serverId: 'srv-1', status: 'ASSIGNED' }),
        ]);
      });

      expect(result.current.items).toHaveLength(1);
    });

    it('keeps the copy with the more recent syncedAt as the survivor', async () => {
      const { result } = renderHook(() => useQueue());

      await act(async () => {
        emitItems([
          makeSpecimen({
            id: 'local-old',
            serverId: 'srv-1',
            sampleUid: 'STALE',
            syncedAt: '2026-01-01T00:00:00Z',
          }),
          makeSpecimen({
            id: 'local-new',
            serverId: 'srv-1',
            sampleUid: 'FRESH',
            syncedAt: '2026-01-02T00:00:00Z',
          }),
        ]);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].sampleUid).toBe('FRESH');
    });

    it('does not collapse two genuinely different specimens', async () => {
      const { result } = renderHook(() => useQueue());

      await act(async () => {
        emitItems([
          makeSpecimen({ id: 'spec-1', serverId: 'srv-1' }),
          makeSpecimen({ id: 'spec-2', serverId: 'srv-2' }),
        ]);
      });

      expect(result.current.items).toHaveLength(2);
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

  // QUEUE-06 — a specimen that moves out of ASSIGNED/PROCESSING elsewhere
  // (confirmed, rejected, etc.) should disappear from the queue on the next
  // reactive emission, without a manual refresh.
  describe('reactive status changes (QUEUE-06)', () => {
    it('drops a specimen from the list once it leaves ASSIGNED/PROCESSING', async () => {
      const { result } = renderHook(() => useQueue());

      await act(async () => {
        emitItems([
          makeSpecimen({ id: 'spec-1', status: 'ASSIGNED' }),
          makeSpecimen({ id: 'spec-2', status: 'PROCESSING' }),
        ]);
      });
      expect(result.current.items.map((i) => i.id)).toEqual(['spec-1', 'spec-2']);

      // WatermelonDB's reactive query re-emits with spec-1 excluded once its
      // status moves past ASSIGNED/PROCESSING (e.g. confirmed or rejected).
      await act(async () => {
        emitItems([makeSpecimen({ id: 'spec-2', status: 'PROCESSING' })]);
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

      // Filter subscription cleaned up; allItems + returned-tracking stay
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
      // mount: 3 (filter + allItems + returned-tracking), setFilter: +1 = 4 total
      expect(database.get).toHaveBeenCalledTimes(4);
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
      expect(clauses[1]).toMatchObject({
        _type: 'where',
        field: 'priority_level',
        value: expected,
      });
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

  // Queue scope change: only ASSIGNED/PROCESSING specimens are shown, plus
  // anything a Supervisor returned for correction (SRS UC 3.4) — tracked via
  // analysis_results, not the specimen's own status.
  describe('returned-for-correction tracking (UC 3.4)', () => {
    it('RETURNED filter falls back to a sentinel (matches nothing) before any result is tracked', () => {
      const { result } = renderHook(() => useQueue());

      act(() => {
        result.current.setFilter('RETURNED');
      });

      const clauses = lastFilterQueryClauses();
      expect(clauses).toHaveLength(1);
      expect(clauses[0]).toMatchObject({ _type: 'where', field: 'server_id' });
      expect((clauses[0] as any).value).toMatchObject({ _type: 'oneOf', vals: ['__none__'] });
    });

    it('ALL/default query becomes an OR of status + server_id once a result is returned', () => {
      renderHook(() => useQueue());

      act(() => {
        emitReturnedResults([{ specimenId: 'srv-9' }]);
      });

      // returnedServerIds changing re-subscribes filter (index 0/1) then
      // allItems (index 1/1) in that order — filter's fresh query is the
      // second-to-last .query(...) call once both have fired.
      const calls = capturedQuery.mock.calls;
      const filterClauses = calls[calls.length - 2] as unknown as Array<Record<string, unknown>>;
      expect(filterClauses).toHaveLength(1);
      expect(filterClauses[0]).toMatchObject({ _type: 'or' });
    });

    it('flags a specimen isReturnedForCorrection once its server_id is tracked as returned', async () => {
      const { result } = renderHook(() => useQueue());

      await act(async () => {
        emitReturnedResults([{ specimenId: 'srv-9' }]);
      });

      // The returnedServerIds change tore down and recreated the filter
      // subscription — feed the fresh one (second-to-last of the two new
      // subscriptions created by the filter+allItems re-subscribe).
      const freshFilterCb = subscribeCalls[subscribeCalls.length - 2].cb;
      await act(async () => {
        freshFilterCb([makeSpecimen({ id: 'spec-9', serverId: 'srv-9', status: 'COMPLETED' })]);
      });

      expect(result.current.items[0].isReturnedForCorrection).toBe(true);
    });

    it('does not flag a specimen whose server_id is not in the returned set', async () => {
      const { result } = renderHook(() => useQueue());

      await act(async () => {
        emitItems([makeSpecimen({ id: 'spec-1', serverId: 'srv-1', status: 'ASSIGNED' })]);
      });

      expect(result.current.items[0].isReturnedForCorrection).toBe(false);
    });

    // Regression: a naive `setReturnedServerIds(results.map(...))` builds a new
    // array on every emission, even an equal-content one, which re-subscribes
    // the filter/allItems queries on every tick — and if one of those
    // re-subscribes happens to land while syncManager's one-time
    // unsafeResetDatabase() is running, WatermelonDB throws instead of queuing.
    // Re-emitting the same set of returned ids must not cause another
    // re-subscribe.
    it('does not re-subscribe when the returned-ids set is emitted again unchanged', async () => {
      renderHook(() => useQueue());

      await act(async () => {
        emitReturnedResults([{ specimenId: 'srv-9' }]);
      });
      const callsAfterFirst = capturedQuery.mock.calls.length;

      await act(async () => {
        emitReturnedResults([{ specimenId: 'srv-9' }]);
      });

      expect(capturedQuery.mock.calls.length).toBe(callsAfterFirst);
    });

    it('does not re-subscribe when the same ids are emitted in a different order', async () => {
      renderHook(() => useQueue());

      await act(async () => {
        emitReturnedResults([{ specimenId: 'srv-a' }, { specimenId: 'srv-b' }]);
      });
      const callsAfterFirst = capturedQuery.mock.calls.length;

      await act(async () => {
        emitReturnedResults([{ specimenId: 'srv-b' }, { specimenId: 'srv-a' }]);
      });

      expect(capturedQuery.mock.calls.length).toBe(callsAfterFirst);
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

  describe('lastSyncAt', () => {
    it('starts null before the persisted timestamp is read', () => {
      const { result } = renderHook(() => useQueue());
      expect(result.current.lastSyncAt).toBeNull();
    });

    it('loads the persisted timestamp from AsyncStorage on mount', async () => {
      const persisted = '2026-05-22T10:00:00.000Z';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(persisted);

      const { result } = renderHook(() => useQueue());

      await act(async () => {});

      expect(AsyncStorage.getItem).toHaveBeenCalledWith(LAST_SYNC_KEY);
      expect(result.current.lastSyncAt).toBe(new Date(persisted).getTime());
    });

    it('refreshes lastSyncAt after a successful refresh()', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const { result } = renderHook(() => useQueue());
      await act(async () => {});
      expect(result.current.lastSyncAt).toBeNull();

      const persisted = '2026-05-22T11:30:00.000Z';
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(persisted);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.lastSyncAt).toBe(new Date(persisted).getTime());
    });
  });
});
