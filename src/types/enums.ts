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
  CONFIRM_RESULT = 'CONFIRM_RESULT',
  OVERRIDE_PARAMETER = 'OVERRIDE_PARAMETER',
  DISCARD_IMAGE = 'DISCARD_IMAGE',
  UPLOAD_IMAGE = 'UPLOAD_IMAGE',
}

export enum PendingSyncStatus {
  PENDING = 'PENDING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
}
