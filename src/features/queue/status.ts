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

// A result only ever gets a field_count once the multi-field capture flow has
// touched it (see saveUploadedField.ts); null/0 means either no result yet or
// a legacy single-image one, which the Queue continues to treat exactly as
// before (SDD Module 2 proposal, section 2.1).
function isMultiField(item: Pick<QueueItem, 'fieldCount'>): boolean {
  return !!item.fieldCount && item.fieldCount > 0;
}

/**
 * @description The one status a Queue sample counts as. Every active sample is exactly
 * one of these, and the card badge, the stats counts, the status filters and the sort
 * order all use this same rule so they can never disagree:
 *  1. RETURNED — a Supervisor sent a result back for correction (SRS UC 3.4), legacy
 *     or multi-field alike: it needs the MedTech, so it has to win even over a
 *     multi-field result otherwise awaiting the website (mobile PR #55 review, 3.9).
 *     That flag lives on the analysis result, and the specimen's own status is
 *     usually still ASSIGNED (or PROCESSING) at that point, so it has to win.
 *  2. CAPTURING — a multi-field result is being collected (SDD Module 2 proposal);
 *     status CAPTURING is unambiguous, it never applies to a legacy result.
 *  3. PROCESSING — the MedTech has begun (legacy) analysis.
 *  4. ASSIGNED — waiting to be started.
 *  5. VERIFYING — a multi-field result has been submitted and is awaiting the
 *     MedTech's check on the website; nothing to do here on mobile. Submit can also
 *     reply RETURNED_FOR_CORRECTION (backend #102, when the result answers an
 *     already-open return) — that still ranks as RETURNED, not here.
 * Anything else has no Queue status.
 * @param item - The specimen's status, correction flag, result status and field count.
 */
export function getQueueStatus(
  item: Pick<QueueItem, 'status' | 'isReturnedForCorrection' | 'resultStatus' | 'fieldCount'>,
): QueueStatus | null {
  if (item.resultStatus === 'CAPTURING') return 'CAPTURING';
  if (item.isReturnedForCorrection) return 'RETURNED';
  const multiFieldAwaitingWeb = isMultiField(item) && item.resultStatus === 'PENDING_CONFIRM';
  if (multiFieldAwaitingWeb) return 'VERIFYING';
  if (item.status === 'PROCESSING') return 'PROCESSING';
  if (item.status === 'ASSIGNED') return 'ASSIGNED';
  return null;
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
  T extends Pick<
    QueueItem,
    'status' | 'isReturnedForCorrection' | 'resultStatus' | 'fieldCount' | 'receivedAt'
  >,
>(items: T[]): T[] {
  const rank = (item: T): number => {
    const status = getQueueStatus(item);
    return status ? STATUS_RANK[status] : Object.keys(STATUS_RANK).length;
  };
  return [...items].sort((a, b) => rank(a) - rank(b) || receivedTime(b) - receivedTime(a));
}
