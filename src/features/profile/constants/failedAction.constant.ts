import { PendingSyncAction } from '@app-types/enums';

/** What each queued change is called when the Profile screen lists it as refused. */
export const FAILED_ACTION_TITLES: Record<string, string> = {
  [PendingSyncAction.REJECT_SPECIMEN]: 'Reject specimen',
  [PendingSyncAction.START_ANALYSIS]: 'Begin analysis',
  [PendingSyncAction.CONFIRM_RESULT]: 'Confirm result',
  [PendingSyncAction.OVERRIDE_PARAMETER]: 'Correct a value',
  [PendingSyncAction.DISCARD_IMAGE]: 'Discard image',
};

export const FAILED_ACTION_FALLBACK_TITLE = 'Change';
export const FAILED_ACTION_FALLBACK_REASON = 'The server did not accept this change.';
