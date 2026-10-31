import { FIELD_CAPTURE_TEXT } from '../constants/fieldCaptureText.constant';

export interface SubmitGuardInput {
  acceptedCount: number;
  minFields: number;
  undecidedCount: number;
  /** Queued Accept/Discard/upload actions not yet sent — see useFieldList.ts. */
  pendingDecisionsCount: number;
  isOnline: boolean;
}

/**
 * @description Why Submit for Verification is disabled, mirroring the backend's own
 * guard order (FIELDS_UNDECIDED before FIELDS_BELOW_MINIMUM); null once none apply.
 * Checked before the two local counts because the server would still see any
 * still-queued decision as undecided, even though the phone already shows it
 * resolved (mobile PR #55 review, 3.6) — coming back online and tapping Submit
 * before the queue drains would otherwise race it into a confusing 409.
 * @param input - Current field counts and connectivity.
 */
export function getSubmitBlockingReason(input: SubmitGuardInput): string | null {
  const { acceptedCount, minFields, undecidedCount, pendingDecisionsCount, isOnline } = input;
  if (!isOnline) return FIELD_CAPTURE_TEXT.submitOfflineBlockedMessage;
  if (pendingDecisionsCount > 0) return FIELD_CAPTURE_TEXT.sendingDecisionsBlockedMessage;
  if (undecidedCount > 0) return FIELD_CAPTURE_TEXT.undecidedFieldsBlockedMessage(undecidedCount);
  if (acceptedCount < minFields) {
    return FIELD_CAPTURE_TEXT.belowMinimumBlockedMessage(acceptedCount, minFields);
  }
  return null;
}
