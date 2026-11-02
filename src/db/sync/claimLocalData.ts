import AsyncStorage from '@react-native-async-storage/async-storage';

import { database } from '../database';
import { deleteAllFieldImages } from './fieldFiles';
import { getLocalDataOwner, setLocalDataOwner } from './localDataOwner';
import {
  FULL_PULL_NEEDED_KEY,
  LAST_SYNC_KEY,
  resetSyncStatus,
  withSyncPaused,
} from './syncManager';

/**
 * @description Makes the local database safe for the user who just logged in. Logout
 * only clears the session, so on a shared phone the previous MedTech's samples,
 * results and unsent changes are still there: the next user would see them, sync only
 * what changed since the other user's last sync, and send the other user's queued
 * changes under their own login.
 *
 * The same user logging back in keeps everything — sessions time out often, and their
 * offline work must survive that. Anyone else, or data with no owner on record, gets a
 * clean database and a full first sync, and every field image on the phone is deleted
 * (mobile PR #55 review, decision #4): the database wipe below only clears rows, and
 * leaving the previous MedTech's field photos behind on the next user's phone is an
 * RA 10173 problem the OS will never clean up on its own now that they live in
 * documentDirectory. Covers the legacy single-image retake flow's photos too — both
 * share imageUtils.ts's FIELDS_DIRECTORY. Call it before the new session is saved or
 * any screen is shown; if it throws, the login must not proceed. Any active sync is
 * cancelled and its writes are drained before checking or changing the owner.
 * @param userId - The user who just authenticated.
 */
export async function claimLocalDataFor(userId: string): Promise<void> {
  await withSyncPaused(async (): Promise<void> => {
    if ((await getLocalDataOwner()) === userId) return;

    deleteAllFieldImages();
    await database.write(async (): Promise<void> => {
      await database.unsafeResetDatabase();
    });
    // No last-sync time: the first sync pulls everything for this user. A refused
    // action from the previous account must not carry over its full-pull marker.
    await AsyncStorage.removeItem(LAST_SYNC_KEY);
    await AsyncStorage.removeItem(FULL_PULL_NEEDED_KEY);
    resetSyncStatus();
    // Last, so an interrupted wipe is tried again at the next login.
    await setLocalDataOwner(userId);
  });
}
