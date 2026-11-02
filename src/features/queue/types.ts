// Re-exported from the canonical definition (matches the backend's native
// Postgres enum exactly) rather than declared here — this file used to have
// its own copy that had quietly drifted out of sync (missing RECEIVED/LABELED).
import type { SpecimenStatus } from '@app-types/enums';
export type { SpecimenStatus };

export type PriorityLevel = 'HIGH' | 'NORMAL' | 'LOW' | 'ROUTINE';

// The Queue only surfaces samples the MedTech can still act on: ASSIGNED,
// PROCESSING, and anything a Supervisor returned for correction (SRS UC 3.4).
// IN_QUEUE (unassigned/general pool) and terminal states (pending approval,
// approved, released, rejected) live in the Reports screen instead.
//
// No priority-based filter (High/Normal/Low/Routine): priorityLevel is
// hardcoded to ROUTINE on the backend today, so filtering by it would only
// ever produce an all-or-nothing result — see QueueItemCard's badge, which
// dropped priority for the same reason.
export type FilterOption =
  | 'ALL'
  | 'DATE'
  | 'LATEST'
  | 'EARLIEST'
  | 'STATUS'
  | 'ASSIGNED'
  | 'PROCESSING'
  | 'RETURNED';

export interface QueueItem {
  id: string;
  serverId: string | null;
  sampleUid: string;
  patientUid: string;
  testType: string;
  status: SpecimenStatus;
  priorityLevel: PriorityLevel | null;
  receivedAt: string;
  medtechId: string | null;
  rejectionReason: string | null;
  rejectionNote: string | null;
  rejectedAt: string | null;
  syncedAt: string | null;
  // True when the Supervisor returned this sample's result for correction
  // (SRS UC 3.4) — derived from analysis_results, not the specimen's own status.
  isReturnedForCorrection: boolean;
  returnReason?: string | null;
  // The specimen's latest analysis result status and accepted field count, both
  // derived from analysis_results (SDD Module 2 proposal) — null/null when there's
  // no result yet, or for a legacy single-image result (fieldCount is only ever
  // set by the multi-field capture flow).
  resultStatus: string | null;
  fieldCount: number | null;
}
