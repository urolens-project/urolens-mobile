/**
 * claimLocalDataFor: makes the local database (and now the field-image folder) safe
 * for whichever MedTech just logged in. The database wipe alone never touched field
 * image files — on a shared phone the previous MedTech's photos stayed behind once
 * they moved to documentDirectory and stopped being OS-reclaimable (mobile PR #55
 * review, decision #4).
 */

jest.mock('@react-native-async-storage/async-storage', () => ({ removeItem: jest.fn() }));
jest.mock('../../src/db/database', () => ({
  database: { write: jest.fn((fn: () => Promise<void>) => fn()), unsafeResetDatabase: jest.fn() },
}));
jest.mock('../../src/db/sync/localDataOwner', () => ({
  getLocalDataOwner: jest.fn(),
  setLocalDataOwner: jest.fn(),
}));
jest.mock('../../src/db/sync/syncManager', () => ({
  FULL_PULL_NEEDED_KEY: 'urolens_full_pull_needed',
  LAST_SYNC_KEY: 'urolens_last_sync_at',
  resetSyncStatus: jest.fn(),
  withSyncPaused: jest.fn(async (fn: () => Promise<void>) => fn()),
}));
jest.mock('../../src/db/sync/fieldFiles', () => ({ deleteAllFieldImages: jest.fn() }));

import { claimLocalDataFor } from '../../src/db/sync/claimLocalData';
import { database } from '../../src/db/database';
import { getLocalDataOwner, setLocalDataOwner } from '../../src/db/sync/localDataOwner';
import { deleteAllFieldImages } from '../../src/db/sync/fieldFiles';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('claimLocalDataFor', () => {
  it('does nothing when the same user logs back in — their offline work stays intact', async () => {
    (getLocalDataOwner as jest.Mock).mockResolvedValue('user-1');

    await claimLocalDataFor('user-1');

    expect(deleteAllFieldImages).not.toHaveBeenCalled();
    expect(database.write).not.toHaveBeenCalled();
    expect(setLocalDataOwner).not.toHaveBeenCalled();
  });

  it('wipes the database and every field image for a genuinely different user', async () => {
    (getLocalDataOwner as jest.Mock).mockResolvedValue('user-1');

    await claimLocalDataFor('user-2');

    expect(deleteAllFieldImages).toHaveBeenCalledTimes(1);
    expect(database.write).toHaveBeenCalledTimes(1);
    expect(database.unsafeResetDatabase).toHaveBeenCalledTimes(1);
    expect(setLocalDataOwner).toHaveBeenCalledWith('user-2');
  });

  it('wipes everything when there is no owner on record yet', async () => {
    (getLocalDataOwner as jest.Mock).mockResolvedValue(null);

    await claimLocalDataFor('user-1');

    expect(deleteAllFieldImages).toHaveBeenCalledTimes(1);
    expect(setLocalDataOwner).toHaveBeenCalledWith('user-1');
  });
});
