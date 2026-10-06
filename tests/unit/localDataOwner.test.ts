/**
 * Whose data the phone holds, and what a login does about it.
 *
 * Logout only clears the session. On a shared phone the previous MedTech's samples,
 * results and unsent changes were still there for the next one: shown in their queue,
 * synced only from the other user's last sync, and the other user's queued changes
 * sent under their login.
 *
 * Covers:
 *  - claimLocalDataFor: the same user keeps everything; a different user, or data with
 *    no owner on record, gets a wiped database, no last-sync time and a reset sync
 *    status; the owner is recorded last, and not at all if the wipe fails
 *  - adoptUnownedLocalData: records the signed-in user only when no owner is on record
 */

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
jest.mock('@db/database', () => ({
  database: {
    write: jest.fn((fn: () => Promise<void>) => fn()),
    unsafeResetDatabase: jest.fn(() => Promise.resolve()),
  },
}));
jest.mock('@db/sync/syncManager', () => ({
  LAST_SYNC_KEY: 'urolens_last_sync_at',
  resetSyncStatus: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { database } from '../../src/db/database';
import { claimLocalDataFor } from '../../src/db/sync/claimLocalData';
import {
  LOCAL_DATA_OWNER_KEY,
  adoptUnownedLocalData,
  getLocalDataOwner,
} from '../../src/db/sync/localDataOwner';
import { resetSyncStatus } from '../../src/db/sync/syncManager';

const LAST_SYNC_KEY = 'urolens_last_sync_at';
const reset = database.unsafeResetDatabase as jest.Mock;

let stored: Record<string, string>;
let order: string[];

beforeEach(() => {
  jest.clearAllMocks();
  stored = {};
  order = [];
  (AsyncStorage.getItem as jest.Mock).mockImplementation(
    async (key: string) => stored[key] ?? null,
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (key: string, value: string) => {
    order.push(`set:${key}`);
    stored[key] = value;
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (key: string) => {
    order.push(`remove:${key}`);
    delete stored[key];
  });
  reset.mockImplementation(async () => {
    order.push('reset');
  });
  (resetSyncStatus as jest.Mock).mockImplementation(() => {
    order.push('resetSyncStatus');
  });
});

describe('claimLocalDataFor', () => {
  it('keeps everything when the same user logs back in', async () => {
    stored[LOCAL_DATA_OWNER_KEY] = 'user-1';
    stored[LAST_SYNC_KEY] = '2026-10-05T08:00:00Z';

    await claimLocalDataFor('user-1');

    expect(reset).not.toHaveBeenCalled();
    expect(stored[LAST_SYNC_KEY]).toBe('2026-10-05T08:00:00Z');
    expect(resetSyncStatus).not.toHaveBeenCalled();
    expect(order).toEqual([]);
  });

  it("wipes the previous user's data when a different user logs in", async () => {
    stored[LOCAL_DATA_OWNER_KEY] = 'user-1';
    stored[LAST_SYNC_KEY] = '2026-10-05T08:00:00Z';

    await claimLocalDataFor('user-2');

    expect(reset).toHaveBeenCalledTimes(1);
    expect(database.write).toHaveBeenCalledTimes(1);
    expect(stored[LAST_SYNC_KEY]).toBeUndefined(); // the first sync pulls everything
    expect(resetSyncStatus).toHaveBeenCalledTimes(1);
    expect(stored[LOCAL_DATA_OWNER_KEY]).toBe('user-2');
  });

  it("wipes data with no owner on record: it cannot be shown to be this user's", async () => {
    stored[LAST_SYNC_KEY] = '2026-10-05T08:00:00Z';

    await claimLocalDataFor('user-2');

    expect(reset).toHaveBeenCalledTimes(1);
    expect(stored[LAST_SYNC_KEY]).toBeUndefined();
    expect(stored[LOCAL_DATA_OWNER_KEY]).toBe('user-2');
  });

  it('records the new owner last, after the data is gone', async () => {
    stored[LOCAL_DATA_OWNER_KEY] = 'user-1';

    await claimLocalDataFor('user-2');

    expect(order).toEqual([
      'reset',
      `remove:${LAST_SYNC_KEY}`,
      'resetSyncStatus',
      `set:${LOCAL_DATA_OWNER_KEY}`,
    ]);
  });

  it('fails, leaving the old owner on record, when the wipe fails — so the next login tries again', async () => {
    stored[LOCAL_DATA_OWNER_KEY] = 'user-1';
    reset.mockRejectedValue(new Error('database is busy'));

    await expect(claimLocalDataFor('user-2')).rejects.toThrow('database is busy');

    expect(stored[LOCAL_DATA_OWNER_KEY]).toBe('user-1');
  });

  it('then keeps the data for that user from then on', async () => {
    await claimLocalDataFor('user-2');
    reset.mockClear();

    await claimLocalDataFor('user-2');

    expect(reset).not.toHaveBeenCalled();
  });
});

describe('adoptUnownedLocalData', () => {
  it('records the signed-in user when no owner is on record', async () => {
    await adoptUnownedLocalData('user-1');

    await expect(getLocalDataOwner()).resolves.toBe('user-1');
  });

  it('never changes an owner already on record', async () => {
    stored[LOCAL_DATA_OWNER_KEY] = 'user-1';

    await adoptUnownedLocalData('user-2');

    expect(stored[LOCAL_DATA_OWNER_KEY]).toBe('user-1');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it.each([null, ''])('does nothing when nobody is signed in (%p)', async (userId) => {
    await adoptUnownedLocalData(userId);

    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('never wipes anything', async () => {
    await adoptUnownedLocalData('user-1');

    expect(reset).not.toHaveBeenCalled();
  });
});
