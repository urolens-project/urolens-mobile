import AsyncStorage from '@react-native-async-storage/async-storage';

import { database } from '../database';
import { getLocalDataOwner, setLocalDataOwner } from './localDataOwner';
import { LAST_SYNC_KEY, resetSyncStatus } from './syncManager';

/**
 * @description Makes the local database safe for the user who just logged in. Logout
 * only clears the session, so on a shared phone the previous MedTech's samples,
 * results and unsent changes are still there: the next user would see them, sync only
 * what changed since the other user's last sync, and send the other user's queued
 * changes under their own login.
 *
 * The same user logging back in keeps everything — sessions time out often, and their
 * offline work must survive that. Anyone else, or data with no owner on record, gets a
 * clean database and a full first sync. Call it before the new session is saved or any
 * screen is shown; if it throws, the login must not proceed.
 * @param userId - The user who just authenticated.
 */
export async function claimLocalDataFor(userId: string): Promise<void> {
  if ((await getLocalDataOwner()) === userId) return;

  await database.write(async () => {
    await database.unsafeResetDatabase();
  });
  // No last-sync time: the first sync pulls everything for this user.
  await AsyncStorage.removeItem(LAST_SYNC_KEY);
  resetSyncStatus();
  // Last, so an interrupted wipe is tried again at the next login.
  await setLocalDataOwner(userId);
}
