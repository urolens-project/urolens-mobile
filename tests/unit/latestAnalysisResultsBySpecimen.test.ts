/**
 * Unit tests for latestAnalysisResultsBySpecimen.
 *
 * The backend enforces exactly one analysis_results row per specimen —
 * retakes update it in place. This function is a defense against a *local
 * sync bug* that could still leave a stale duplicate copy of that row
 * sitting in WatermelonDB, not against a real multi-row lifecycle. Code
 * that only looked at "does ANY result for this specimen have status X"
 * kept treating specimens as stuck in an old state (e.g. Returned for
 * Correction, or Pending Supervisor Approval) whenever such a duplicate
 * existed — which is why those specimens stayed visible in the Queue, and
 * never showed up under the right category in Reports.
 */

import { latestAnalysisResultsBySpecimen } from '../../src/db/latestAnalysisResultsBySpecimen';

function makeResult(overrides: {
  specimenId: string;
  status: string;
  confirmedAt?: string | null;
  syncedAt?: string | null;
  createdAt?: number;
}) {
  return {
    specimenId: overrides.specimenId,
    status: overrides.status,
    confirmedAt: overrides.confirmedAt ?? null,
    syncedAt: overrides.syncedAt ?? null,
    createdAt: overrides.createdAt ?? 0,
  } as any;
}

describe('latestAnalysisResultsBySpecimen', () => {
  it('returns a single-entry map for a specimen with only one result', () => {
    const r = makeResult({ specimenId: 'srv-1', status: 'PENDING_CONFIRM' });
    const latest = latestAnalysisResultsBySpecimen([r]);

    expect(latest.size).toBe(1);
    expect(latest.get('srv-1')).toBe(r);
  });

  it('keeps every specimen independent when each has only one result', () => {
    const a = makeResult({ specimenId: 'srv-1', status: 'APPROVED' });
    const b = makeResult({ specimenId: 'srv-2', status: 'RETURNED_FOR_CORRECTION' });
    const latest = latestAnalysisResultsBySpecimen([a, b]);

    expect(latest.get('srv-1')).toBe(a);
    expect(latest.get('srv-2')).toBe(b);
  });

  it('picks the result with the later confirmedAt when both are present', () => {
    const old = makeResult({
      specimenId: 'srv-1',
      status: 'RETURNED_FOR_CORRECTION',
      confirmedAt: '2026-01-01T00:00:00Z',
    });
    const recent = makeResult({
      specimenId: 'srv-1',
      status: 'APPROVED',
      confirmedAt: '2026-01-05T00:00:00Z',
    });
    const latest = latestAnalysisResultsBySpecimen([old, recent]);

    expect(latest.get('srv-1')).toBe(recent);
  });

  it('does not matter which order the duplicate results were fetched in', () => {
    const old = makeResult({
      specimenId: 'srv-1',
      status: 'RETURNED_FOR_CORRECTION',
      confirmedAt: '2026-01-01T00:00:00Z',
    });
    const recent = makeResult({
      specimenId: 'srv-1',
      status: 'RELEASED',
      confirmedAt: '2026-01-05T00:00:00Z',
    });
    const latest = latestAnalysisResultsBySpecimen([recent, old]);

    expect(latest.get('srv-1')).toBe(recent);
  });

  it('falls back to syncedAt when confirmedAt is missing on one or both results', () => {
    const old = makeResult({
      specimenId: 'srv-1',
      status: 'PENDING_CONFIRM',
      syncedAt: '2026-01-01T00:00:00Z',
    });
    const recent = makeResult({
      specimenId: 'srv-1',
      status: 'RELEASED',
      syncedAt: '2026-01-10T00:00:00Z',
    });
    const latest = latestAnalysisResultsBySpecimen([old, recent]);

    expect(latest.get('srv-1')).toBe(recent);
  });

  it('falls back to the local createdAt when neither confirmedAt nor syncedAt is set', () => {
    const old = makeResult({ specimenId: 'srv-1', status: 'PENDING_CONFIRM', createdAt: 100 });
    const recent = makeResult({ specimenId: 'srv-1', status: 'APPROVED', createdAt: 200 });
    const latest = latestAnalysisResultsBySpecimen([old, recent]);

    expect(latest.get('srv-1')).toBe(recent);
  });

  it('collapses a 3-result history down to just the latest', () => {
    const first = makeResult({
      specimenId: 'srv-1',
      status: 'RETURNED_FOR_CORRECTION',
      confirmedAt: '2026-01-01T00:00:00Z',
    });
    const second = makeResult({
      specimenId: 'srv-1',
      status: 'PENDING_SUPERVISOR_APPROVAL',
      confirmedAt: '2026-01-03T00:00:00Z',
    });
    const third = makeResult({
      specimenId: 'srv-1',
      status: 'RELEASED',
      confirmedAt: '2026-01-05T00:00:00Z',
    });
    const latest = latestAnalysisResultsBySpecimen([second, third, first]);

    expect(latest.size).toBe(1);
    expect(latest.get('srv-1')).toBe(third);
  });

  it('returns an empty map for an empty input', () => {
    expect(latestAnalysisResultsBySpecimen([]).size).toBe(0);
  });
});
