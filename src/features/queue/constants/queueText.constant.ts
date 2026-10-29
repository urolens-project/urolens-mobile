export const QUEUE_TEXT = {
  filterChips: {
    all: 'All',
    date: 'Date',
    status: 'Status',
  },
  header: {
    appName: 'UroLens',
    appSubtitle: 'Laboratory Diagnostics',
    title: 'My Sample Queue',
    notificationsAccessibilityLabel: 'Notifications',
    role: 'Medical Technologist',
    syncAccessibilityLabel: 'Sync',
  },
  actionBar: {
    reject: 'Reject',
  },
  proceedLabels: {
    continue: 'Continue',
    continueCapturing: 'Continue Capturing',
    proceedToAnalysis: 'Proceed to Analysis',
  },
  itemCard: {
    returnedForCorrection: 'Returned for correction',
    selectHint: 'Select sample, then use Proceed or Continue to open its details.',
    verifyOnWebsite: 'Continue on the website',
  },
  loadState: {
    errorTitle: 'Couldn’t load queue',
    errorWithCache: 'Showing saved samples. Refresh to try again.',
    errorNoCache: 'Your queue could not be loaded. Please try again.',
    retryAccessibilityLabel: 'Retry loading queue',
    retryButton: 'Try again',
    loading: 'Loading your queue…',
  },
  emptyState: {
    offlineTitle: "You're offline",
    offlineSub: 'Connect to sync your latest queue.',
    noMatchesTitle: 'No matches',
    noMatchesSub: 'Try selecting a different filter.',
    caughtUpTitle: 'You’re all caught up',
    caughtUpSub: 'No samples are currently waiting on you.',
  },
  pagination: {
    previous: 'Previous',
    next: 'Next',
    previousAccessibilityLabel: 'Previous queue page',
    nextAccessibilityLabel: 'Next queue page',
  },
  sync: {
    notYetSynced: 'Not yet synced',
    justNow: 'just now',
  },
} as const;

/**
 * @description Formats the active-samples summary shown under the Queue header title.
 * @param activeCount - Number of samples currently active in the queue.
 */
export function formatActiveSamplesLabel(activeCount: number): string {
  return `${activeCount} Active Samples`;
}

/**
 * @description Formats the selected-sample label shown on the Queue action bar.
 * @param sampleUid - The selected sample's UID.
 */
export function formatSelectedSampleLabel(sampleUid: string): string {
  return `Selected: ${sampleUid}`;
}

/**
 * @description Formats the return-reason line shown on a returned queue card.
 * @param reason - The supervisor's return reason.
 */
export function formatReturnReasonLabel(reason: string | null | undefined): string {
  return `Reason: ${reason ?? ''}`;
}

/**
 * @description Formats the field progress shown on a CAPTURING queue card
 * (SDD Module 2 proposal) — e.g. "7 of 10 fields".
 * @param acceptedCount - Accepted field count so far.
 * @param minFields - Minimum accepted fields required.
 */
export function formatFieldCounterLabel(acceptedCount: number, minFields: number): string {
  return `${acceptedCount} of ${minFields} fields`;
}

/**
 * @description Formats the "Showing X-Y of Z" summary on Queue pagination.
 * @param firstItem - Index of the first item on the current page.
 * @param lastItem - Index of the last item on the current page.
 * @param totalItems - Total number of items across all pages.
 */
export function formatPaginationSummary(
  firstItem: number,
  lastItem: number,
  totalItems: number,
): string {
  return `Showing ${firstItem}–${lastItem} of ${totalItems}`;
}

/**
 * @description Formats the "Page X of Y" indicator on Queue pagination.
 * @param page - Current page number.
 * @param pageCount - Total number of pages.
 */
export function formatPageIndicator(page: number, pageCount: number): string {
  return `Page ${page} of ${pageCount}`;
}

/**
 * @description Formats how long ago the Queue last synced, for the sync status pill.
 * @param lastSyncAt - Timestamp of the last successful sync, or null if never synced.
 */
export function formatLastSyncLabel(lastSyncAt: number | null): string {
  if (!lastSyncAt) return QUEUE_TEXT.sync.notYetSynced;
  const minutes = Math.max(0, Math.floor((Date.now() - lastSyncAt) / 60000));
  if (minutes < 1) return QUEUE_TEXT.sync.justNow;
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
