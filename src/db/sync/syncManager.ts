import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '@lib/auth/tokenStorage';
import { database } from '../database';
import { adoptUnownedLocalData } from './localDataOwner';
import { pullChanges } from './pullChanges';
import { hasPendingActions, pushChanges, requeueLegacyFailedActions } from './pushChanges';

export const LAST_SYNC_KEY = 'urolens_last_sync_at';

// Set when the server refused a queued change. The phone already shows that change
// as done, and a normal sync only brings rows the server changed — so nothing would
// ever correct it. The next sync with nothing left to send pulls everything again.
export const FULL_PULL_NEEDED_KEY = 'urolens_full_pull_needed';

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

/** @description Current sync outcome, for any screen to read (see `useSyncStatus`). */
export function getSyncStatus(): SyncStatus {
  return syncStatus;
}

/** @description Registers a listener for sync-status changes; call the return value to unsubscribe. */
export function subscribeSyncStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

// Guard against concurrent syncs
let isSyncing = false;

/**
 * @description Runs one full sync cycle: push local changes, then pull the server's
 * state down. A no-op if a sync is already in progress.
 */
export async function synchronize(): Promise<void> {
  if (isSyncing) {
    return;
  }

  isSyncing = true;
  setSyncStatus({ state: 'syncing' });
  try {
    await adoptUnownedLocalData(await tokenStorage.getUserId());
    const lastSyncedAt = await AsyncStorage.getItem(LAST_SYNC_KEY);

    // 1. Push FIRST — Send upstream local modifications so the server can run conflict checks
    await requeueLegacyFailedActions();
    const { refusedCount } = await pushChanges();
    if (refusedCount > 0) await AsyncStorage.setItem(FULL_PULL_NEEDED_KEY, '1');

    // 2. On full sync, reset local DB so records deleted on the server don't persist locally.
    //    Never while changes are still waiting to be sent — the reset would erase them.
    if (!lastSyncedAt && !(await hasPendingActions())) {
      await database.write(async () => {
        await database.unsafeResetDatabase();
      });
    }

    // 3. Pull SECOND — Fetch the absolute, source-of-truth state down from the server.
    //    Everything, when a refused change left the phone out of step — but only once
    //    nothing is waiting to be sent, or the pull would undo changes still on their way.
    const isFullPullDue =
      (await AsyncStorage.getItem(FULL_PULL_NEEDED_KEY)) !== null && !(await hasPendingActions());
    const newTimestamp = await pullChanges(isFullPullDue ? null : lastSyncedAt);

    // 4. Persist Timestamp ONLY after both steps succeed cleanly
    if (newTimestamp) {
      await AsyncStorage.setItem(LAST_SYNC_KEY, newTimestamp);
    }
    if (isFullPullDue) await AsyncStorage.removeItem(FULL_PULL_NEEDED_KEY);
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

/** @description Whether a sync cycle is currently running. */
export function getIsSyncing(): boolean {
  return isSyncing;
}

/**
 * @description Forgets the last sync's outcome, as if the app had never synced. Used
 * when the local data is wiped for a different user (see claimLocalDataFor), so no
 * screen says "synchronized" about data that is no longer there.
 */
export function resetSyncStatus(): void {
  setSyncStatus({ state: 'idle', lastSuccessAt: null });
}
