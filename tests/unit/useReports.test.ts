/**
 * Unit tests for useReports hook.
 *
 * Covers:
 *  - Initial loading state
 *  - sections always has all 4 categories, in fixed order, even when empty
 *    (the Reports screen renders one card per category up front)
 *  - Rejected specimens surface under the REJECTED section
 *  - Finished analysis_results (pending approval / approved / released)
 *    surface under their matching section, joined to their specimen by server_id
 *  - Within a section, items sort most-recently-finalized first
 *  - RETURNED_FOR_CORRECTION results are excluded (that belongs in the Queue)
 *  - A result with no matching local specimen is skipped, not crashed on
 *  - totalCount reflects rejected specimens + finished results
 */

// ─── Mocks (hoisted before imports) ─────────────────────────────────────────

jest.mock('@nozbe/watermelondb', () => ({
  Q: {
    where: jest.fn((field: string, value: unknown) => ({ _type: 'where', field, value })),
    oneOf: jest.fn((vals: unknown[]) => ({ _type: 'oneOf', vals })),
  },
  Model: class {},
}));

jest.mock('@db/database', () => ({ database: { get: jest.fn() } }));
jest.mock('@db/sync/syncManager', () => ({ synchronize: jest.fn() }));
jest.mock('@hooks/useNetworkStatus', () => ({ useNetworkStatus: jest.fn() }));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { renderHook, act } from '@testing-library/react-native';
import { useReports } from '../../src/features/reports/hooks/useReports';
import { database } from '../../src/db/database';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import type { ReportCategory, ReportSection } from '../../src/features/reports/types';

function findSection(sections: ReportSection[], category: ReportCategory): ReportSection {
  const section = sections.find((s) => s.category === category);
  if (!section) throw new Error(`No section for category ${category}`);
  return section;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSpecimen(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'spec-1',
    serverId: 'srv-1',
    sampleUid: 'SAMPLE-001',
    patientUid: 'PT-001',
    testType: 'Urinalysis',
    status: 'ASSIGNED',
    priorityLevel: 'NORMAL',
    receivedAt: '2026-05-22T09:00:00Z',
    rejectionReason: null,
    rejectedAt: null,
    ...overrides,
  };
}

function makeResult(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'res-1',
    serverId: 'srv-res-1',
    specimenId: 'srv-1',
    status: 'PENDING_SUPERVISOR_APPROVAL',
    confirmedAt: '2026-05-22T10:00:00Z',
    ...overrides,
  };
}

// The hook subscribes to specimens first, then analysis_results — in that
// fixed order, with no re-subscriptions (both effects have empty deps).
let emitSpecimens: (rows: ReturnType<typeof makeSpecimen>[]) => void;
let emitResults: (rows: ReturnType<typeof makeResult>[]) => void;
const mockUnsubscribe = jest.fn();

function buildDbChain() {
  let subscribeCallCount = 0;
  const mockSubscribe = jest.fn().mockImplementation((cb: (rows: unknown[]) => void) => {
    subscribeCallCount += 1;
    if (subscribeCallCount === 1) emitSpecimens = cb;
    if (subscribeCallCount === 2) emitResults = cb;
    return { unsubscribe: mockUnsubscribe };
  });
  const mockObserve = jest.fn(() => ({ subscribe: mockSubscribe }));
  const mockQuery = jest.fn(() => ({ observe: mockObserve }));
  const mockGet = jest.fn(() => ({ query: mockQuery }));
  return { mockGet };
}

beforeEach(() => {
  jest.clearAllMocks();
  const { mockGet } = buildDbChain();
  (database.get as jest.Mock).mockImplementation(mockGet);
  (useNetworkStatus as jest.Mock).mockReturnValue({ isOnline: true });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useReports', () => {
  it('starts with isLoading true and all 4 (empty) category sections', () => {
    const { result } = renderHook(() => useReports());
    expect(result.current.isLoading).toBe(true);
    expect(result.current.sections.map((s) => s.category)).toEqual([
      'PENDING_APPROVAL',
      'APPROVED',
      'RELEASED',
      'REJECTED',
    ]);
    expect(result.current.sections.every((s) => s.data.length === 0)).toBe(true);
  });

  it('clears isLoading only once both specimens and results have emitted', async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      emitSpecimens([]);
    });
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      emitResults([]);
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('puts a REJECTED specimen under the Rejected section', async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      emitSpecimens([makeSpecimen({ status: 'REJECTED', rejectionReason: 'INSUFFICIENT_VOLUME' })]);
      emitResults([]);
    });

    const rejected = findSection(result.current.sections, 'REJECTED');
    expect(rejected.title).toBe('Rejected');
    expect(rejected.data[0].rejectionReason).toBe('INSUFFICIENT_VOLUME');
    // Every other category stays empty, not omitted
    expect(result.current.sections).toHaveLength(4);
  });

  // Named after the actual user action, per the "must reflect fast"
  // requirement: rejecting a specimen (useRejectSpecimen writes
  // status='REJECTED' straight to WatermelonDB, synchronously and purely
  // locally) must make it show up under Rejected in the very same reactive
  // tick — the same local write the Queue test observes leaving the Queue.
  it('reflects a rejection immediately: the specimen appears under Rejected in the same tick, no sync involved', async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      emitSpecimens([makeSpecimen({ id: 'spec-1', status: 'ASSIGNED' })]);
      emitResults([]);
    });
    expect(result.current.sections.every((s) => s.data.length === 0)).toBe(true);

    // Simulates exactly what useRejectSpecimen's local specimen.update()
    // does — WatermelonDB's reactive query re-emits immediately.
    await act(async () => {
      emitSpecimens([
        makeSpecimen({
          id: 'spec-1',
          status: 'REJECTED',
          rejectionReason: 'WRONG_CONTAINER',
          rejectedAt: '2026-05-22T09:05:00Z',
        }),
      ]);
    });

    const rejected = findSection(result.current.sections, 'REJECTED');
    expect(rejected.data.map((i) => i.id)).toEqual(['spec-1']);
  });

  it('does not surface a non-rejected, non-finished specimen anywhere', async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      emitSpecimens([makeSpecimen({ status: 'ASSIGNED' })]);
      emitResults([]);
    });

    expect(result.current.sections.every((s) => s.data.length === 0)).toBe(true);
  });

  it.each([
    ['PENDING_SUPERVISOR_APPROVAL', 'PENDING_APPROVAL', 'Pending Supervisor Approval'],
    ['APPROVED', 'APPROVED', 'Approved by Supervisor'],
    ['RELEASED', 'RELEASED', 'Released'],
  ] as const)(
    'joins a %s result to its specimen and files it under %s',
    async (resultStatus, category, title) => {
      const { result } = renderHook(() => useReports());

      await act(async () => {
        emitSpecimens([makeSpecimen({ serverId: 'srv-42' })]);
        emitResults([makeResult({ specimenId: 'srv-42', status: resultStatus })]);
      });

      const section = findSection(result.current.sections, category);
      expect(section.title).toBe(title);
      expect(section.data[0].id).toBe('spec-1');
    },
  );

  it('excludes RETURNED_FOR_CORRECTION results — that belongs in the Queue, not Reports', async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      emitSpecimens([makeSpecimen({ serverId: 'srv-42' })]);
      emitResults([makeResult({ specimenId: 'srv-42', status: 'RETURNED_FOR_CORRECTION' })]);
    });

    expect(result.current.sections.every((s) => s.data.length === 0)).toBe(true);
  });

  it('skips a result whose specimen has not synced locally yet, without crashing', async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      emitSpecimens([]); // specimen for srv-99 not present locally
      emitResults([makeResult({ specimenId: 'srv-99', status: 'APPROVED' })]);
    });

    expect(result.current.sections.every((s) => s.data.length === 0)).toBe(true);
  });

  it('sorts items within a section by finalizedAt, most recent first', async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      emitSpecimens([
        makeSpecimen({ id: 'spec-a', serverId: 'srv-a' }),
        makeSpecimen({ id: 'spec-b', serverId: 'srv-b' }),
      ]);
      emitResults([
        makeResult({
          specimenId: 'srv-a',
          status: 'APPROVED',
          confirmedAt: '2026-05-20T00:00:00Z',
        }),
        makeResult({
          specimenId: 'srv-b',
          status: 'APPROVED',
          confirmedAt: '2026-05-22T00:00:00Z',
        }),
      ]);
    });

    expect(findSection(result.current.sections, 'APPROVED').data.map((i) => i.id)).toEqual([
      'spec-b',
      'spec-a',
    ]);
  });

  it('totalCount reflects rejected specimens plus finished results', async () => {
    const { result } = renderHook(() => useReports());

    await act(async () => {
      emitSpecimens([
        makeSpecimen({ id: 'spec-r', status: 'REJECTED' }),
        makeSpecimen({ id: 'spec-a', serverId: 'srv-a' }),
      ]);
      emitResults([makeResult({ specimenId: 'srv-a', status: 'APPROVED' })]);
    });

    expect(result.current.totalCount).toBe(2);
  });

  // Regression: PAT-00004/00006 ("Approved by Supervisor") and
  // PAT-000015/000016 ("Released") — a specimen can have more than one
  // analysis_results row (e.g. a retake after being returned for
  // correction creates a new row instead of replacing the old one). Only
  // the LATEST result should decide the specimen's category.
  describe('multiple analysis_results per specimen — only the latest counts', () => {
    it('files a specimen under Approved, not omitted or duplicated, when an older result was Returned for Correction', async () => {
      const { result } = renderHook(() => useReports());

      await act(async () => {
        emitSpecimens([makeSpecimen({ serverId: 'srv-4' })]);
        emitResults([
          makeResult({
            specimenId: 'srv-4',
            status: 'RETURNED_FOR_CORRECTION',
            confirmedAt: '2026-01-01T00:00:00Z',
          }),
          makeResult({
            specimenId: 'srv-4',
            status: 'APPROVED',
            confirmedAt: '2026-01-05T00:00:00Z',
          }),
        ]);
      });

      const approved = findSection(result.current.sections, 'APPROVED');
      expect(approved.data).toHaveLength(1);
      expect(approved.data[0].id).toBe('spec-1');
      // Not filed anywhere else
      expect(result.current.sections.filter((s) => s.data.length > 0)).toHaveLength(1);
    });

    it('files a specimen under Released, not under its earlier Pending Approval state', async () => {
      const { result } = renderHook(() => useReports());

      await act(async () => {
        emitSpecimens([makeSpecimen({ serverId: 'srv-15' })]);
        emitResults([
          makeResult({
            specimenId: 'srv-15',
            status: 'PENDING_SUPERVISOR_APPROVAL',
            confirmedAt: '2026-01-01T00:00:00Z',
          }),
          makeResult({
            specimenId: 'srv-15',
            status: 'RELEASED',
            confirmedAt: '2026-01-05T00:00:00Z',
          }),
        ]);
      });

      const released = findSection(result.current.sections, 'RELEASED');
      expect(released.data).toHaveLength(1);
      const pendingApproval = findSection(result.current.sections, 'PENDING_APPROVAL');
      expect(pendingApproval.data).toHaveLength(0);
    });

    it('order of the two results in the emission does not change which one wins', async () => {
      const { result } = renderHook(() => useReports());

      await act(async () => {
        emitSpecimens([makeSpecimen({ serverId: 'srv-4' })]);
        emitResults([
          makeResult({
            specimenId: 'srv-4',
            status: 'APPROVED',
            confirmedAt: '2026-01-05T00:00:00Z',
          }),
          makeResult({
            specimenId: 'srv-4',
            status: 'RETURNED_FOR_CORRECTION',
            confirmedAt: '2026-01-01T00:00:00Z',
          }),
        ]);
      });

      expect(findSection(result.current.sections, 'APPROVED').data).toHaveLength(1);
    });
  });

  it('unsubscribes both subscriptions on unmount', () => {
    const { unmount } = renderHook(() => useReports());
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(2);
  });
});
