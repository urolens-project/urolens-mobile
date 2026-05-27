import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from '../database';
import { pullChanges } from './pullChanges';
import { pushChanges } from './pushChanges';

const LAST_SYNC_KEY = 'urolens_last_sync_at';

// Guard against concurrent syncs
let isSyncing = false;
export async function synchronize(): Promise<void> {
  if (isSyncing) {
    console.log('[SyncManager] Sync already in progress — skipping.');
    return;
  }

  isSyncing = true;
  try {
    const lastSyncedAt = await AsyncStorage.getItem(LAST_SYNC_KEY);

    console.log('[SyncManager] Starting sync cycle...');

    // 1. Push FIRST — Send upstream local modifications so the server can run conflict checks
    await pushChanges();

    // 2. On full sync, reset local DB so records deleted on the server don't persist locally
    if (!lastSyncedAt) {
      await database.write(async () => {
        await database.unsafeResetDatabase();
      });
      console.log('[SyncManager] Local DB reset for full sync.');
    }

    // 3. Pull SECOND — Fetch the absolute, source-of-truth state down from the server
    const newTimestamp = await pullChanges(lastSyncedAt);

    // 3. Persist Timestamp ONLY after both steps succeed cleanly
    if (newTimestamp) {
      await AsyncStorage.setItem(LAST_SYNC_KEY, newTimestamp);
      console.log(`[SyncManager] Sync complete at ${newTimestamp}`);
    }
  } catch (err) {
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
