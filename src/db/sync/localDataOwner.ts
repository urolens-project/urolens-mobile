import AsyncStorage from '@react-native-async-storage/async-storage';

// Whose samples, results and unsent changes the local database holds. Not a secret
// (it is the same user id the sync already stores rows under), so it lives in
// AsyncStorage and survives logout — that is the point: it is how the next login
// can tell whether the data on the phone is its own.
export const LOCAL_DATA_OWNER_KEY = 'urolens_local_data_owner';

/** @description The user the local data belongs to, or null when that isn't recorded. */
export async function getLocalDataOwner(): Promise<string | null> {
  return AsyncStorage.getItem(LOCAL_DATA_OWNER_KEY);
}

/**
 * @description Records who the local data belongs to.
 * @param userId - The user whose data the phone now holds.
 */
export async function setLocalDataOwner(userId: string): Promise<void> {
  await AsyncStorage.setItem(LOCAL_DATA_OWNER_KEY, userId);
}

/**
 * @description Records the signed-in user as the owner of local data that has none on
 * record. Phones updated from a version without owner tracking hold data and a live
 * session but no owner; without this, that user's next login would look like a
 * different user and wipe their unsent work. Does nothing once an owner is recorded.
 * @param userId - The signed-in user, or null when nobody is.
 */
export async function adoptUnownedLocalData(userId: string | null): Promise<void> {
  if (!userId) return;
  if ((await getLocalDataOwner()) !== null) return;
  await setLocalDataOwner(userId);
}
