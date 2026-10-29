import { FIELD_CAPTURE_TEXT } from '../constants/fieldCaptureText.constant';

export interface SubmitGuardInput {
  acceptedCount: number;
  minFields: number;
  undecidedCount: number;
  isOnline: boolean;
}

/**
 * @description Why Submit for Verification is disabled, mirroring the backend's own
 * guard order (FIELDS_UNDECIDED before FIELDS_BELOW_MINIMUM); null once none apply.
 * @param input - Current field counts and connectivity.
 */
export function getSubmitBlockingReason(input: SubmitGuardInput): string | null {
  const { acceptedCount, minFields, undecidedCount, isOnline } = input;
  if (!isOnline) return FIELD_CAPTURE_TEXT.submitOfflineBlockedMessage;
  if (undecidedCount > 0) return FIELD_CAPTURE_TEXT.undecidedFieldsBlockedMessage(undecidedCount);
  if (acceptedCount < minFields) {
    return FIELD_CAPTURE_TEXT.belowMinimumBlockedMessage(acceptedCount, minFields);
  }
  return null;
}
