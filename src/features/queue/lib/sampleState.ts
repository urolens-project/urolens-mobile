import type { ResultStatus, SpecimenStatus } from '@app-types/enums';

// A result's status as the app stores it: the enum's string values, or null when
// the specimen has no analysis result yet.
type ResultState = `${ResultStatus}` | null;

export interface SampleActions {
  /** Start (or resume) image capture and analysis. */
  canBeginAnalysis: boolean;
  /** Reject the specimen. */
  canReject: boolean;
  /** Confirm the AI result and send it to the Supervisor. */
  canConfirm: boolean;
  /** Discard the image and capture a new one. */
  canRetake: boolean;
}

// What the server accepts for start-analysis (specimen_service._STARTABLE_STATUSES),
// plus PROCESSING, which it treats as "already started" — so a MedTech who backed out
// of capture can pick up where they left off.
const BEGINNABLE_STATUSES: readonly SpecimenStatus[] = ['ASSIGNED', 'IN_QUEUE', 'PROCESSING'];

// Results the MedTech has already handed on. Past this point the result belongs to the
// Supervisor's workflow, so rejecting the specimen would strand it.
const SUBMITTED_RESULT_STATUSES: readonly ResultState[] = [
  'PENDING_SUPERVISOR_APPROVAL',
  'RETURNED_FOR_CORRECTION',
  'CRITICAL_ESCALATED',
  'APPROVED',
  'RELEASED',
];

/**
 * @description Why a specimen can't be rejected right now, in words fit to show the
 * MedTech — or null when it can. This is the one rule for Reject; it mirrors the server
 * (specimen_service.rejectSpecimen), so the app never offers what the API refuses.
 * Reject is only for a specimen still in the MedTech's hands: no result yet, or a
 * result awaiting their own confirmation.
 * @param specimenStatus - The specimen's current status.
 * @param resultStatus - The specimen's latest analysis result status, if any.
 */
export function getRejectBlockedReason(
  specimenStatus: SpecimenStatus,
  resultStatus: ResultState,
): string | null {
  if (specimenStatus === 'REJECTED') return 'This specimen has already been rejected.';
  if (specimenStatus === 'COMPLETED') return 'This specimen is already completed.';
  if (SUBMITTED_RESULT_STATUSES.includes(resultStatus)) {
    return (
      "This specimen's result has already been submitted for supervisor review, so the " +
      'specimen can no longer be rejected. Ask the supervisor to return the result if the ' +
      'specimen is unsuitable.'
    );
  }
  return null;
}

/**
 * @description Which actions the Sample Detail screen offers for a specimen. Every rule
 * here mirrors a server guard, so the screen never offers something the API will refuse:
 *
 *  - A rejected specimen is closed: nothing can be done with it, and its result
 *    must never be confirmed or sent on to the Supervisor.
 *  - Reject follows getRejectBlockedReason.
 *  - Begin Analysis is only for a specimen with no result yet.
 * @param specimenStatus - The specimen's current status.
 * @param resultStatus - The specimen's latest analysis result status, if any.
 */
export function getSampleActions(
  specimenStatus: SpecimenStatus,
  resultStatus: ResultState,
): SampleActions {
  const isRejected = specimenStatus === 'REJECTED';

  return {
    canBeginAnalysis: resultStatus === null && BEGINNABLE_STATUSES.includes(specimenStatus),
    canReject: getRejectBlockedReason(specimenStatus, resultStatus) === null,
    canConfirm: !isRejected && resultStatus === 'PENDING_CONFIRM',
    canRetake:
      !isRejected &&
      (resultStatus === 'PENDING_CONFIRM' || resultStatus === 'RETURNED_FOR_CORRECTION'),
  };
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const RESULT_STATUS_LABELS: Partial<Record<`${ResultStatus}`, string>> = {
  RETURNED_FOR_CORRECTION: 'Returned for Correction',
  CRITICAL_ESCALATED: 'Critical / Escalated',
  PENDING_SUPERVISOR_APPROVAL: 'Pending Supervisor Approval',
  APPROVED: 'Approved',
  RELEASED: 'Released',
};

const SPECIMEN_STATUS_LABELS: Partial<Record<SpecimenStatus, string>> = {
  PROCESSING: 'In Progress',
};

/**
 * @description The one status line shown on Sample Detail, in the same words the Queue
 * uses. A rejected specimen wins, then whatever stage the result has reached, then the
 * specimen's own status.
 * @param specimenStatus - The specimen's current status.
 * @param resultStatus - The specimen's latest analysis result status, if any.
 */
export function getSampleStatusLabel(
  specimenStatus: SpecimenStatus,
  resultStatus: ResultState,
): string {
  if (specimenStatus === 'REJECTED') return 'Rejected';
  const resultLabel = resultStatus ? RESULT_STATUS_LABELS[resultStatus] : undefined;
  if (resultLabel) return resultLabel;
  return SPECIMEN_STATUS_LABELS[specimenStatus] ?? titleCase(specimenStatus);
}
