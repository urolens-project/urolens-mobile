import type AnalysisResult from './models/AnalysisResult';

function recencyOf(r: AnalysisResult): number {
  const iso = r.confirmedAt ?? r.syncedAt;
  if (iso) {
    const ms = new Date(iso).getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  return r.createdAt ?? 0;
}

/**
 * A specimen can accumulate more than one analysis_results row over its
 * lifecycle — an image retake after a Supervisor "returned for correction"
 * decision creates a new row rather than replacing the old one (see
 * sample/[id].tsx, which already has to pick `results[0]` out of an array
 * for the same reason). Any code that cares about a specimen's CURRENT
 * result state must only look at its most recent row: otherwise a stale
 * "Returned for Correction" or "Pending Supervisor Approval" row keeps
 * flagging a specimen that has since moved on to Approved or Released —
 * which is why samples showing "Released"/"Approved by Supervisor" could
 * still appear in the Queue, and why they didn't move to Reports.
 *
 * Recency is judged by confirmedAt first (a real domain timestamp set when
 * the MedTech/Supervisor actually acted) and falls back to syncedAt, then
 * the local WatermelonDB createdAt as a last resort.
 */
export function latestAnalysisResultsBySpecimen(
  results: AnalysisResult[],
): Map<string, AnalysisResult> {
  const latest = new Map<string, AnalysisResult>();
  for (const r of results) {
    const existing = latest.get(r.specimenId);
    if (!existing || recencyOf(r) > recencyOf(existing)) {
      latest.set(r.specimenId, r);
    }
  }
  return latest;
}
