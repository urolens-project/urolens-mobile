import type { SyncStatus } from '@db/sync/syncManager';

// ok      — connected and up to date
// caution — nothing wrong, but the list may be stale (offline / never synced)
// error   — connected, but the last sync failed
export type SyncPillTone = 'ok' | 'caution' | 'error';

export interface SyncPill {
  label: string;
  tone: SyncPillTone;
}

interface Input {
  isOnline: boolean;
  sync: SyncStatus;
  // When the persisted last sync happened (survives app restarts), if ever.
  lastSyncAt: number | null;
}

/**
 * What the Queue's status pill says. Being online isn't the same as being in
 * sync, so connected states are split by whether syncing actually worked.
 */
export function getSyncPill({ isOnline, sync, lastSyncAt }: Input): SyncPill {
  if (!isOnline) {
    return { label: 'Offline • Showing cached data', tone: 'caution' };
  }
  if (sync.state === 'failed') {
    return { label: 'Online • Sync failed, showing cached data', tone: 'error' };
  }
  const hasSynced = lastSyncAt !== null || sync.lastSuccessAt !== null;
  if (!hasSynced) {
    return sync.state === 'syncing'
      ? { label: 'Online • Syncing…', tone: 'ok' }
      : { label: 'Online • Not yet synced', tone: 'caution' };
  }
  return { label: 'Online • Queue Synchronized', tone: 'ok' };
}
