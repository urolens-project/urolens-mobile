import type { QueueItem } from './types';

export type QueueStatus = 'RETURNED' | 'CAPTURING' | 'PROCESSING' | 'ASSIGNED' | 'VERIFYING';

// Display order, most in need of attention first. CAPTURING ranks with the
// legacy in-progress states (there's still work for the MedTech to do);
// VERIFYING ranks last since nothing is left for them until web acts.
const STATUS_RANK: Record<QueueStatus, number> = {
  RETURNED: 0,
  CAPTURING: 1,
  PROCESSING: 2,
  ASSIGNED: 3,
  VERIFYING: 4,
};

/**
 * @description The one status a Queue sample counts as. Every active sample is exactly
 * one of these, and the card badge, the stats counts, the status filters and the sort
 * order all use this same rule so they can never disagree:
 *  1. RETURNED — a Supervisor sent a result back for correction (SRS UC 3.4), legacy
 *     or multi-field alike: it needs the MedTech, so it has to win even over a
 *     multi-field result otherwise awaiting the website (mobile PR #55 review, 3.9),
 *     AND even once the website's Capture More Fields has reopened it and the result
 *     is back to CAPTURING — the correction isn't done until it's resubmitted. That
 *     flag lives on the analysis result, and the specimen's own status is usually
 *     still ASSIGNED (or PROCESSING) at that point, so it has to win.
 *  2. CAPTURING — a multi-field result is being collected (SDD Module 2 proposal),
 *     and isn't an open return.
 *  3. PROCESSING — the MedTech has begun (legacy) analysis.
 *  4. ASSIGNED — waiting to be started. IN_QUEUE (unassigned pool, SRS UC 2.2) counts
 *     the same way: nothing in the backend sets it today, but older rows may have it.
 *  5. VERIFYING — the result is waiting on a check on the website, multi-field or
 *     legacy single-image alike (mobile PR #55 review, #3): PENDING_CONFIRM,
 *     IMAGE_RETAKE_REQUESTED and FAILED all land here regardless of field count,
 *     since confirming/retaking/overriding all happen on the website now, not on
 *     mobile. Submit can also reply RETURNED_FOR_CORRECTION (backend #102, when the
 *     result answers an already-open return) — that still ranks as RETURNED, not here.
 * Anything else has no Queue status.
 * @param item - The specimen's status, correction flag and result status.
 */
export function getQueueStatus(
  item: Pick<QueueItem, 'status' | 'isReturnedForCorrection' | 'resultStatus'>,
): QueueStatus | null {
  if (item.isReturnedForCorrection) return 'RETURNED';
  if (item.resultStatus === 'CAPTURING') return 'CAPTURING';
  const awaitingWeb =
    item.resultStatus === 'PENDING_CONFIRM' ||
    item.resultStatus === 'IMAGE_RETAKE_REQUESTED' ||
    item.resultStatus === 'FAILED';
  if (awaitingWeb) return 'VERIFYING';
  if (item.status === 'PROCESSING') return 'PROCESSING';
  if (item.status === 'ASSIGNED' || item.status === 'IN_QUEUE') return 'ASSIGNED';
  return null;
}

/**
 * @description How many items have each Queue status — the same rule the badge and
 * sort already use, so a chip or tile count can never disagree with what it shows.
 * @param items - Queue items to count; only status-related fields are read.
 */
export function countByQueueStatus<
  T extends Pick<QueueItem, 'status' | 'isReturnedForCorrection' | 'resultStatus'>,
>(items: T[]): Record<QueueStatus, number> {
  const totals: Record<QueueStatus, number> = {
    RETURNED: 0,
    CAPTURING: 0,
    PROCESSING: 0,
    ASSIGNED: 0,
    VERIFYING: 0,
  };
  for (const item of items) {
    const status = getQueueStatus(item);
    if (status) totals[status] += 1;
  }
  return totals;
}

export type ProceedAction =
  | 'PROCEED_TO_ANALYSIS'
  | 'CONTINUE'
  | 'CONTINUE_CAPTURING'
  | 'CONTINUE_ON_WEBSITE';

/**
 * @description Which action the Queue's Proceed/Continue button represents for a
 * selected card — text-free so the UI maps it to its own label (QUEUE_TEXT). A
 * returned sample is CONTINUE_CAPTURING once the website's Capture More Fields has
 * reopened it (result back to CAPTURING) and CONTINUE_ON_WEBSITE until then —
 * everything else already has nothing left to do on the phone
 * (mobile-queue-status-n8, Q1).
 * @param status - The selected item's Queue status.
 * @param resultStatus - The selected item's latest analysis result status.
 */
export function getProceedAction(
  status: QueueStatus | null,
  resultStatus: string | null,
): ProceedAction {
  if (status === 'RETURNED') {
    return resultStatus === 'CAPTURING' ? 'CONTINUE_CAPTURING' : 'CONTINUE_ON_WEBSITE';
  }
  if (status === 'CAPTURING') return 'CONTINUE_CAPTURING';
  if (status === 'PROCESSING' || status === 'VERIFYING') return 'CONTINUE';
  return 'PROCEED_TO_ANALYSIS';
}

function receivedTime(item: Pick<QueueItem, 'receivedAt'>): number {
  const ms = new Date(item.receivedAt).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * @description Returned, then In Progress, then Assigned; newest first within each group.
 * Returns a new array.
 * @param items - Queue items to order; only status-related fields are read.
 */
export function orderByStatus<
  T extends Pick<QueueItem, 'status' | 'isReturnedForCorrection' | 'resultStatus' | 'receivedAt'>,
>(items: T[]): T[] {
  const rank = (item: T): number => {
    const status = getQueueStatus(item);
    return status ? STATUS_RANK[status] : Object.keys(STATUS_RANK).length;
  };
  return [...items].sort((a, b) => rank(a) - rank(b) || receivedTime(b) - receivedTime(a));
}
