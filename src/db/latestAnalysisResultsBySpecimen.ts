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
 * The backend enforces exactly one analysis_results row per specimen
 * (specimen_id is unique) — a retake updates that row in place rather than
 * creating a second one (image_retake_service.py says so explicitly: "The
 * AnalysisResult row remains intact — it will be updated"). So in the
 * *correct* steady state there's nothing to pick a "latest" from.
 *
 * This exists as a second line of defense against a *bug*, not a real
 * multi-row lifecycle: a past sync issue could leave more than one local
 * copy of that single server row sitting in WatermelonDB (dedupeByServerId
 * cleans this up on every sync, but a gap between syncs — or a future,
 * unforeseen duplication bug — could still let one slip through). If that
 * ever happens, only the most recently-confirmed copy should count:
 * otherwise a stale local "Returned for Correction" or "Pending Supervisor
 * Approval" duplicate keeps flagging a specimen that has since moved on to
 * Approved or Released — which is what actually caused samples showing
 * "Released"/"Approved by Supervisor" to still appear in the Queue.
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
