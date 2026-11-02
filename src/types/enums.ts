export enum UserRole {
  RECEPTIONIST = 'RECEPTIONIST',
  MEDTECH = 'MEDTECH',
  SUPERVISOR = 'SUPERVISOR',
  PHYSICIAN = 'PHYSICIAN',
  PATIENT = 'PATIENT',
  ADMINISTRATOR = 'ADMINISTRATOR',
}

// The single source of truth for specimen status, matching the backend's
// native Postgres enum exactly (specimen.py's _SPECIMEN_STATUS). A plain
// string union, not an enum object: nothing in the app needs `.ASSIGNED`
// member-access, only type-level comparisons against WatermelonDB's own
// plain-string field values — features/queue/types.ts re-exports this
// rather than declaring its own (formerly out-of-sync) copy.
export type SpecimenStatus =
  | 'RECEIVED'
  | 'LABELED'
  | 'ASSIGNED'
  | 'IN_QUEUE'
  | 'PROCESSING'
  | 'REJECTED'
  | 'COMPLETED';

export enum ResultStatus {
  // Multi-field workflow (SDD Module 2 proposal): fields are being
  // collected on mobile, below the minimum or not yet submitted.
  CAPTURING = 'CAPTURING',
  PENDING_CONFIRM = 'PENDING_CONFIRM',
  PENDING_SUPERVISOR_APPROVAL = 'PENDING_SUPERVISOR_APPROVAL',
  APPROVED = 'APPROVED',
  RELEASED = 'RELEASED',
  RETURNED_FOR_CORRECTION = 'RETURNED_FOR_CORRECTION',
  CRITICAL_ESCALATED = 'CRITICAL_ESCALATED',
}

export enum RejectionReason {
  INSUFFICIENT_VOLUME = 'INSUFFICIENT_VOLUME',
  WRONG_CONTAINER = 'WRONG_CONTAINER',
  UNLABELED = 'UNLABELED',
  OTHER = 'OTHER',
}

export enum ProbabilityLevel {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
}

export enum PendingSyncAction {
  REJECT_SPECIMEN = 'REJECT_SPECIMEN',
  START_ANALYSIS = 'START_ANALYSIS',
  // Pre-multi-field actions. CONFIRM_RESULT and OVERRIDE_PARAMETER are
  // retired from mobile under the multi-field workflow (confirmation and
  // correction move to the web verification workspace) and DISCARD_IMAGE's
  // route answers 410 APP_UPDATE_REQUIRED once the backend flag is on. Any
  // of the three still queued from an old app version is drained once, to
  // FAILED, on first launch of the multi-field build — see the legacy-queue
  // migration (Section 8 of the proposal) — never dispatched here again.
  CONFIRM_RESULT = 'CONFIRM_RESULT',
  OVERRIDE_PARAMETER = 'OVERRIDE_PARAMETER',
  DISCARD_IMAGE = 'DISCARD_IMAGE',
  // Multi-field workflow (SDD Module 2 proposal). UPLOAD_IMAGE existed
  // before but was never dispatched (no offline queue for image upload);
  // it's repurposed here to mean "upload one captured field," posting to
  // POST /fields instead of the retired POST /images/upload.
  UPLOAD_IMAGE = 'UPLOAD_IMAGE',
  ACCEPT_FIELD = 'ACCEPT_FIELD',
  DISCARD_FIELD = 'DISCARD_FIELD',
}

export enum PendingSyncStatus {
  PENDING = 'PENDING',
  SYNCED = 'SYNCED',
  // The server refused it (or it expired): shown to the MedTech until dismissed.
  FAILED = 'FAILED',
  // A FAILED change the MedTech has seen and cleared from the list.
  DISMISSED = 'DISMISSED',
}
