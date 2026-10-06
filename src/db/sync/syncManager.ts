import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '@lib/auth/tokenStorage';

import { database } from '../database';
import { adoptUnownedLocalData, getLocalDataOwner } from './localDataOwner';
import { pullChanges } from './pullChanges';
import { hasPendingActions, pushChanges, requeueLegacyFailedActions } from './pushChanges';
import { throwIfSyncCancelled } from './syncCancellation';

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

interface ActiveSync {
  controller: AbortController;
  completion: Promise<void>;
}

let activeSync: ActiveSync | null = null;
let syncPauseCount = 0;
let localDataChangeTail = Promise.resolve();

/**
 * @description Runs one full sync cycle: push local changes, then pull the server's
 * state down. A no-op during another cycle or an account change, or when the
 * stored session does not own the local database.
 */
export function synchronize(): Promise<void> {
  if (activeSync || syncPauseCount > 0) {
    return Promise.resolve();
  }

  const cycle: ActiveSync = {
    controller: new AbortController(),
    completion: Promise.resolve(),
  };
  activeSync = cycle;
  // Register completion before work can notify listeners that request an account change.
  cycle.completion = Promise.resolve().then((): Promise<void> => runSync(cycle));
  return cycle.completion;
}

async function runSync(cycle: ActiveSync): Promise<void> {
  const { signal } = cycle.controller;
  try {
    throwIfSyncCancelled(signal);
    const userId = await tokenStorage.getUserId();
    throwIfSyncCancelled(signal);
    if (!userId) return;
    await adoptUnownedLocalData(userId);
    throwIfSyncCancelled(signal);
    const owner = await getLocalDataOwner();
    throwIfSyncCancelled(signal);
    // A login claims the database before saving its session. During that interval,
    // background triggers must not send the previous user's token against the new data.
    if (owner !== userId) return;
    setSyncStatus({ state: 'syncing' });
    const lastSyncedAt = await AsyncStorage.getItem(LAST_SYNC_KEY);
    throwIfSyncCancelled(signal);

    // 1. Push FIRST — Send upstream local modifications so the server can run conflict checks
    await requeueLegacyFailedActions(signal);
    throwIfSyncCancelled(signal);
    const { refusedCount } = await pushChanges(signal);
    throwIfSyncCancelled(signal);
    if (refusedCount > 0) await AsyncStorage.setItem(FULL_PULL_NEEDED_KEY, '1');
    throwIfSyncCancelled(signal);

    // 2. On full sync, reset local DB so records deleted on the server don't persist locally.
    //    Never while changes are still waiting to be sent — the reset would erase them.
    const canReset = !lastSyncedAt && !(await hasPendingActions());
    throwIfSyncCancelled(signal);
    if (canReset) {
      await database.write(async (): Promise<void> => {
        throwIfSyncCancelled(signal);
        await database.unsafeResetDatabase();
      });
      throwIfSyncCancelled(signal);
    }

    // 3. Pull SECOND — Fetch the absolute, source-of-truth state down from the server.
    //    Everything, when a refused change left the phone out of step — but only once
    //    nothing is waiting to be sent, or the pull would undo changes still on their way.
    const isFullPullDue =
      (await AsyncStorage.getItem(FULL_PULL_NEEDED_KEY)) !== null && !(await hasPendingActions());
    throwIfSyncCancelled(signal);
    const newTimestamp = await pullChanges(isFullPullDue ? null : lastSyncedAt, signal);
    throwIfSyncCancelled(signal);

    // 4. Persist Timestamp ONLY after both steps succeed cleanly
    if (newTimestamp) {
      await AsyncStorage.setItem(LAST_SYNC_KEY, newTimestamp);
      throwIfSyncCancelled(signal);
    }
    if (isFullPullDue) await AsyncStorage.removeItem(FULL_PULL_NEEDED_KEY);
    throwIfSyncCancelled(signal);
    setSyncStatus({ state: 'succeeded', lastSuccessAt: Date.now() });
  } catch (err) {
    // Account changes cancel a cycle intentionally; it must not overwrite the next
    // account's status or surface as a network failure to a background caller.
    if (signal.aborted) return;
    setSyncStatus({ state: 'failed' });
    // If pushing or pulling throws a Network Error, code execution drops out here safely
    console.error('[SyncManager] Sync cycle aborted due to error:', err);
    throw err; // Propagate up so UI indicators can display a "Sync Failed" warning
  } finally {
    if (activeSync === cycle) activeSync = null;
  }
}

/** @description Whether a sync cycle is currently running. */
export function getIsSyncing(): boolean {
  return activeSync !== null;
}

/**
 * @description Cancels and drains the active cycle, then serializes local account
 * changes while blocking new syncs. Draining also covers database and storage writes
 * that have already started and cannot be aborted.
 * @param changeLocalData - Account change to perform after the old cycle has stopped.
 */
export async function withSyncPaused(changeLocalData: () => Promise<void>): Promise<void> {
  syncPauseCount += 1;
  const running = activeSync;
  if (running) {
    running.controller.abort();
    resetSyncStatus();
  }
  const drained = running?.completion.catch((): void => {}) ?? Promise.resolve();
  const change = localDataChangeTail.then(async (): Promise<void> => {
    await drained;
    await changeLocalData();
  });
  // A failed wipe must not block later attempts; the caller still receives the error.
  localDataChangeTail = change.catch((): void => {});
  try {
    await change;
  } finally {
    syncPauseCount -= 1;
  }
}

/**
 * @description Forgets the last sync's outcome, as if the app had never synced. Used
 * when the local data is wiped for a different user (see claimLocalDataFor), so no
 * screen says "synchronized" about data that is no longer there.
 */
export function resetSyncStatus(): void {
  setSyncStatus({ state: 'idle', lastSuccessAt: null });
}
