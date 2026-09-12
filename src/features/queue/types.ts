export type PriorityLevel = 'HIGH' | 'NORMAL' | 'LOW' | 'ROUTINE';

export type SpecimenStatus = 'IN_QUEUE' | 'ASSIGNED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';

// Per SDD/SRS & Mobile Developer Guide (STORY-MOB-05):
// Filter chips — All · High (priority) · Normal (priority) · Assigned (status) · Processing (status)
//
// The Queue only surfaces samples the MedTech can still act on: ASSIGNED,
// PROCESSING, and anything a Supervisor returned for correction (SRS UC 3.4).
// IN_QUEUE (unassigned/general pool) and terminal states (pending approval,
// approved, released, rejected) live in the Reports screen instead.
export type FilterOption =
  | 'ALL'
  | 'DATE'
  | 'LATEST'
  | 'EARLIEST'
  | 'PRIORITY'
  | 'HIGH'
  | 'NORMAL'
  | 'LOW'
  | 'ROUTINE'
  | 'STATUS'
  | 'ASSIGNED'
  | 'PROCESSING'
  | 'RETURNED';

export interface QueueItem {
  id: string;
  serverId: string | null;
  sampleUid: string;
  patientName: string;
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
}
