import type { QueueItem } from './types';

export type QueueStatus = 'RETURNED' | 'PROCESSING' | 'ASSIGNED';

// Display order, most in need of attention first.
const STATUS_RANK: Record<QueueStatus, number> = {
  RETURNED: 0,
  PROCESSING: 1,
  ASSIGNED: 2,
};

/**
 * @description The one status a Queue sample counts as. Every active sample is exactly
 * one of these, and the card badge, the stats counts, the status filters and the sort
 * order all use this same rule so they can never disagree:
 *  1. RETURNED — a Supervisor sent the result back for correction (SRS UC 3.4).
 *     That flag lives on the analysis result, and the specimen's own status is
 *     usually still ASSIGNED (or PROCESSING) at that point, so it has to win.
 *  2. PROCESSING — the MedTech has begun the analysis.
 *  3. ASSIGNED — waiting to be started.
 * Anything else has no Queue status.
 * @param item - The specimen's status and correction flag.
 */
export function getQueueStatus(
  item: Pick<QueueItem, 'status' | 'isReturnedForCorrection'>,
): QueueStatus | null {
  if (item.isReturnedForCorrection) return 'RETURNED';
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
  T extends Pick<QueueItem, 'status' | 'isReturnedForCorrection' | 'receivedAt'>,
>(items: T[]): T[] {
  const rank = (item: T): number => {
    const status = getQueueStatus(item);
    return status ? STATUS_RANK[status] : Object.keys(STATUS_RANK).length;
  };
  return [...items].sort((a, b) => rank(a) - rank(b) || receivedTime(b) - receivedTime(a));
}
