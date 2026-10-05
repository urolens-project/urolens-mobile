import type PendingSync from '@db/models/PendingSync';

import {
  FAILED_ACTION_FALLBACK_REASON,
  FAILED_ACTION_FALLBACK_TITLE,
  FAILED_ACTION_TITLES,
} from '../constants/failedAction.constant';
import type { FailedActionUi } from '../types';

// pushChanges stores a refusal as "ERROR_CODE: the server's message". The code is for
// logs; the MedTech reads the message.
const CODE_PREFIX = /^[A-Z][A-Z0-9_]*: /;

/**
 * @description Turns a refused queued change into what the Profile screen lists: what
 * was attempted, on which sample, and the server's reason without its error code.
 * @param item - The refused change from the local queue.
 * @param sampleUid - The sample it was about, if known.
 */
export function mapFailedActionToUi(item: PendingSync, sampleUid: string | null): FailedActionUi {
  const reason = (item.errorMessage ?? '').replace(CODE_PREFIX, '').trim();
  return {
    id: item.id,
    title: FAILED_ACTION_TITLES[item.action] ?? FAILED_ACTION_FALLBACK_TITLE,
    sampleUid,
    reason: reason || FAILED_ACTION_FALLBACK_REASON,
  };
}
