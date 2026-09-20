import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../database';
import { pullChanges } from './pullChanges';
import { hasPendingActions, pushChanges, requeueLegacyFailedActions } from './pushChanges';

export const LAST_SYNC_KEY = 'urolens_last_sync_at';

// What the last sync attempt did, for the UI ("Queue Synchronized" vs "Sync failed").
// Kept here, not in a screen, so a failure from a background sync (app start,
// reconnect, push notification) is visible to every screen, not just the one that
// happened to start it.
export type SyncState = 'idle' | 'syncing' | 'succeeded' | 'failed';
export interface SyncStatus {
  state: SyncState;
  // When a sync last completed cleanly during this app session.
  lastSuccessAt: number | null;
}

let syncStatus: SyncStatus = { state: 'idle', lastSuccessAt: null };
const statusListeners = new Set<() => void>();

function setSyncStatus(patch: Partial<SyncStatus>): void {
  syncStatus = { ...syncStatus, ...patch };
  statusListeners.forEach((listener) => listener());
}

export function getSyncStatus(): SyncStatus {
  return syncStatus;
}

export function subscribeSyncStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

// Guard against concurrent syncs
let isSyncing = false;
export async function synchronize(): Promise<void> {
  if (isSyncing) {
    return;
  }

  isSyncing = true;
  setSyncStatus({ state: 'syncing' });
  try {
    const lastSyncedAt = await AsyncStorage.getItem(LAST_SYNC_KEY);

    // 1. Push FIRST — Send upstream local modifications so the server can run conflict checks
    await requeueLegacyFailedActions();
    await pushChanges();

    // 2. On full sync, reset local DB so records deleted on the server don't persist locally.
    //    Never while changes are still waiting to be sent — the reset would erase them.
    if (!lastSyncedAt && !(await hasPendingActions())) {
      await database.write(async () => {
        await database.unsafeResetDatabase();
      });
    }

    // 3. Pull SECOND — Fetch the absolute, source-of-truth state down from the server
    const newTimestamp = await pullChanges(lastSyncedAt);

    // 3. Persist Timestamp ONLY after both steps succeed cleanly
    if (newTimestamp) {
      await AsyncStorage.setItem(LAST_SYNC_KEY, newTimestamp);
    }
    setSyncStatus({ state: 'succeeded', lastSuccessAt: Date.now() });
  } catch (err) {
    setSyncStatus({ state: 'failed' });
    // If pushing or pulling throws a Network Error, code execution drops out here safely
    console.error('[SyncManager] Sync cycle aborted due to error:', err);
    throw err; // Propagate up so UI indicators can display a "Sync Failed" warning
  } finally {
    isSyncing = false;
  }
}

export function getIsSyncing(): boolean {
  return isSyncing;
}
