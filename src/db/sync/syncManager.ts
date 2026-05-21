import AsyncStorage from '@react-native-async-storage/async-storage';
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

    // Pull first — get latest server state before pushing local writes
    const newTimestamp = await pullChanges(lastSyncedAt);

    // Push second — send all queued offline actions to the server
    await pushChanges();

    await AsyncStorage.setItem(LAST_SYNC_KEY, newTimestamp);
    console.log(`[SyncManager] Sync complete at ${newTimestamp}`);
  } catch (err) {
    console.error('[SyncManager] Sync failed:', err);
  } finally {
    isSyncing = false;
  }
}

export function getIsSyncing(): boolean {
  return isSyncing;
}
