import type { SyncStatus } from '@db/sync/syncManager';

// ok      — connected and up to date
// caution — nothing wrong, but the list may be stale (offline / never synced)
// error   — connected, but the last sync failed
export type SyncPillTone = 'ok' | 'caution' | 'error';

export interface SyncPill {
  label: string;
  tone: SyncPillTone;
}

interface GetSyncPillInput {
  isOnline: boolean;
  sync: SyncStatus;
  /** When the persisted last sync happened (survives app restarts), if ever. */
  lastSyncAt: number | null;
  /** Queued changes the server refused and the MedTech hasn't dismissed. */
  failedActionCount?: number;
}

/**
 * @description What the Queue's status pill says. Being online isn't the same as being
 * in sync, so connected states are split by whether syncing actually worked.
 * @param isOnline - Whether the device currently has connectivity.
 * @param sync - Current sync manager state.
 * @param lastSyncAt - Persisted timestamp of the last successful sync, if any.
 * @param failedActionCount - Queued changes the server refused, not yet dismissed.
 */
export function getSyncPill({
  isOnline,
  sync,
  lastSyncAt,
  failedActionCount = 0,
}: GetSyncPillInput): SyncPill {
  if (!isOnline) {
    return { label: 'Offline • Showing cached data', tone: 'caution' };
  }
  if (sync.state === 'syncing') {
    return { label: 'Online • Syncing…', tone: 'ok' };
  }
  if (sync.state === 'failed') {
    return { label: 'Online • Sync failed, showing cached data', tone: 'error' };
  }
  // The sync itself worked, but something the MedTech did never reached the server.
  // The details, and the way to clear this, are on the Profile tab.
  if (failedActionCount > 0) {
    const changes = failedActionCount === 1 ? '1 change' : `${failedActionCount} changes`;
    return { label: `${changes} couldn't be sent • See Profile`, tone: 'error' };
  }
  const hasSynced = lastSyncAt !== null || sync.lastSuccessAt !== null;
  if (!hasSynced) {
    return { label: 'Online • Not yet synced', tone: 'caution' };
  }
  return { label: 'Online • Queue Synchronized', tone: 'ok' };
}
