// Path: urolens-mobile/tests/unit/syncManager.test.ts
// Tests syncManager in isolation by resetting module state between each test
// so the module-level isSyncing guard starts false every time.

// Prevent database.ts from loading the native SQLite adapter after resetModules()
jest.mock('@db/database', () => ({
  database: {
    write: jest.fn((fn: () => Promise<void>) => fn()),
    unsafeResetDatabase: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('@db/sync/pullChanges', () => ({
  pullChanges: jest.fn(),
}));

jest.mock('@db/sync/pushChanges', () => ({
  pushChanges: jest.fn(),
  hasPendingActions: jest.fn(),
  requeueLegacyFailedActions: jest.fn(),
}));

jest.mock('@db/sync/localDataOwner', () => ({
  adoptUnownedLocalData: jest.fn(),
}));

jest.mock('@lib/auth/tokenStorage', () => ({
  tokenStorage: { getUserId: jest.fn() },
}));

// Fresh module + fresh mock instances per test (resets isSyncing = false)
let synchronize: () => Promise<void>;
let getIsSyncing: () => boolean;
let mockPull: jest.Mock;
let mockPush: jest.Mock;
let mockHasPending: jest.Mock;
let mockRequeue: jest.Mock;
let mockReset: jest.Mock;
let getSyncStatus: () => { state: string; lastSuccessAt: number | null };
let subscribeSyncStatus: (listener: () => void) => () => void;
let mockGetItem: jest.Mock;
let mockSetItem: jest.Mock;
let mockRemoveItem: jest.Mock;
// What AsyncStorage holds, by key. Tests set entries; setItem/removeItem keep it current.
let stored: Record<string, string>;

const LAST_SYNC_KEY = 'urolens_last_sync_at';
const FULL_PULL_NEEDED_KEY = 'urolens_full_pull_needed';
const NOTHING_REFUSED = { refusedCount: 0 };

beforeEach(() => {
  jest.resetModules();

  ({
    synchronize,
    getIsSyncing,
    getSyncStatus,
    subscribeSyncStatus,
  } = require('@db/sync/syncManager'));
  ({ pullChanges: mockPull } = require('@db/sync/pullChanges'));
  ({
    pushChanges: mockPush,
    hasPendingActions: mockHasPending,
    requeueLegacyFailedActions: mockRequeue,
  } = require('@db/sync/pushChanges'));
  mockReset = require('@db/database').database.unsafeResetDatabase;

  const as = require('@react-native-async-storage/async-storage');
  mockGetItem = as.getItem;
  mockSetItem = as.setItem;
  mockRemoveItem = as.removeItem;

  stored = {};
  mockPull.mockResolvedValue('2026-05-26T10:00:00Z');
  mockPush.mockResolvedValue(NOTHING_REFUSED);
  mockHasPending.mockResolvedValue(false);
  mockRequeue.mockResolvedValue(undefined);
  mockGetItem.mockImplementation(async (key: string) => stored[key] ?? null);
  mockSetItem.mockImplementation(async (key: string, value: string) => {
    stored[key] = value;
  });
  mockRemoveItem.mockImplementation(async (key: string) => {
    delete stored[key];
  });
});

describe('synchronize', () => {
  it('calls pushChanges before pullChanges (push-then-pull order)', async () => {
    const order: string[] = [];
    mockPush.mockImplementation(async () => {
      order.push('push');
      return NOTHING_REFUSED;
    });
    mockPull.mockImplementation(async () => {
      order.push('pull');
      return '2026-05-26T10:00:00Z';
    });

    await synchronize();

    expect(order).toEqual(['push', 'pull']);
  });

  it('passes lastSyncedAt from AsyncStorage to pullChanges', async () => {
    stored[LAST_SYNC_KEY] = '2026-05-25T08:00:00Z';

    await synchronize();

    expect(mockPull).toHaveBeenCalledWith('2026-05-25T08:00:00Z');
  });

  it('passes null to pullChanges when AsyncStorage has no timestamp', async () => {
    await synchronize();

    expect(mockPull).toHaveBeenCalledWith(null);
  });

  it('saves the new timestamp returned by pullChanges', async () => {
    mockPull.mockResolvedValue('2026-05-26T12:00:00Z');

    await synchronize();

    expect(mockSetItem).toHaveBeenCalledWith('urolens_last_sync_at', '2026-05-26T12:00:00Z');
  });

  it('does not save timestamp when pullChanges returns falsy', async () => {
    mockPull.mockResolvedValue(null as unknown as string);

    await synchronize();

    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('skips a concurrent call while a sync is already in progress', async () => {
    let unblockPush: () => void;
    const blocker = new Promise<typeof NOTHING_REFUSED>((res) => {
      unblockPush = () => res(NOTHING_REFUSED);
    });
    mockPush.mockReturnValue(blocker);

    const first = synchronize(); // starts, stalls at pushChanges
    await synchronize(); // should return immediately (guard)
    await new Promise((res) => setImmediate(res)); // let the first sync reach its push

    expect(mockPush).toHaveBeenCalledTimes(1); // only one push

    unblockPush!();
    await first;
  });

  it('propagates pushChanges errors to the caller', async () => {
    mockPush.mockRejectedValue(new Error('Network failure'));

    await expect(synchronize()).rejects.toThrow('Network failure');
  });

  it('propagates pullChanges errors to the caller', async () => {
    mockPull.mockRejectedValue(new Error('Server error'));

    await expect(synchronize()).rejects.toThrow('Server error');
  });

  it('resets isSyncing to false after an error', async () => {
    mockPush.mockRejectedValue(new Error('boom'));

    await expect(synchronize()).rejects.toThrow();
    expect(getIsSyncing()).toBe(false);
  });

  it('resets isSyncing to false after a successful sync', async () => {
    await synchronize();
    expect(getIsSyncing()).toBe(false);
  });
});

describe('getIsSyncing', () => {
  it('returns false before any sync', () => {
    expect(getIsSyncing()).toBe(false);
  });

  it('returns true while a sync is running', async () => {
    let unblockPush: () => void;
    mockPush.mockReturnValue(
      new Promise<typeof NOTHING_REFUSED>((res) => {
        unblockPush = () => res(NOTHING_REFUSED);
      }),
    );

    const syncPromise = synchronize();
    expect(getIsSyncing()).toBe(true);

    unblockPush!();
    await syncPromise;
    expect(getIsSyncing()).toBe(false);
  });
});

describe('unsent changes and the full-sync reset', () => {
  it('resets the local database on a first (full) sync when nothing is waiting to be sent', async () => {
    mockHasPending.mockResolvedValue(false);

    await synchronize();

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  // The reset erases pending_sync too — with retries, unsent changes can now
  // outlive a sync, so it must not run while any are still waiting.
  it('does NOT reset the local database while changes are still waiting to be sent', async () => {
    mockHasPending.mockResolvedValue(true);

    await synchronize();

    expect(mockReset).not.toHaveBeenCalled();
    expect(mockPull).toHaveBeenCalled(); // still pulls, merging in place
  });

  it('gives previously-failed changes their one retry before pushing', async () => {
    const order: string[] = [];
    mockRequeue.mockImplementation(async () => {
      order.push('requeue');
    });
    mockPush.mockImplementation(async () => {
      order.push('push');
      return NOTHING_REFUSED;
    });

    await synchronize();

    expect(order).toEqual(['requeue', 'push']);
  });
});

// A change made offline is shown as done straight away. If the server then refuses it,
// nothing changed on the server, so an ordinary sync brings nothing back and the phone
// would keep showing it as done (UROLENS-220).
describe('a refused change puts the phone back in step with the server', () => {
  beforeEach(() => {
    stored[LAST_SYNC_KEY] = '2026-05-25T08:00:00Z';
  });

  it('pulls everything, not just what changed, right after a refusal', async () => {
    mockPush.mockResolvedValue({ refusedCount: 1 });

    await synchronize();

    expect(mockPull).toHaveBeenCalledWith(null);
    expect(stored[FULL_PULL_NEEDED_KEY]).toBeUndefined();
    expect(stored[LAST_SYNC_KEY]).toBe('2026-05-26T10:00:00Z');
  });

  it('keeps the data on the phone: a re-pull is not a reset', async () => {
    mockPush.mockResolvedValue({ refusedCount: 1 });

    await synchronize();

    expect(mockReset).not.toHaveBeenCalled();
  });

  it('pulls only what changed when nothing was refused', async () => {
    await synchronize();

    expect(mockPull).toHaveBeenCalledWith('2026-05-25T08:00:00Z');
    expect(mockSetItem).not.toHaveBeenCalledWith(FULL_PULL_NEEDED_KEY, expect.anything());
  });

  // Pulling everything overwrites local rows; a change still waiting to be sent would
  // be undone on screen while it sits in the queue.
  it('waits while other changes are still to be sent, then pulls everything on a later sync', async () => {
    mockPush.mockResolvedValue({ refusedCount: 1 });
    mockHasPending.mockResolvedValue(true);

    await synchronize();

    expect(mockPull).toHaveBeenLastCalledWith('2026-05-25T08:00:00Z');
    expect(stored[FULL_PULL_NEEDED_KEY]).toBe('1');

    mockPush.mockResolvedValue(NOTHING_REFUSED);
    mockHasPending.mockResolvedValue(false);

    await synchronize();

    expect(mockPull).toHaveBeenLastCalledWith(null);
    expect(stored[FULL_PULL_NEEDED_KEY]).toBeUndefined();
  });

  it('tries again next sync when the pull itself fails', async () => {
    mockPush.mockResolvedValue({ refusedCount: 2 });
    mockPull.mockRejectedValue(new Error('Server error'));

    await expect(synchronize()).rejects.toThrow('Server error');

    expect(stored[FULL_PULL_NEEDED_KEY]).toBe('1');
  });

  it('survives an app restart: a refusal recorded earlier still triggers the full pull', async () => {
    stored[FULL_PULL_NEEDED_KEY] = '1';

    await synchronize();

    expect(mockPull).toHaveBeenCalledWith(null);
  });
});

describe('sync status (drives the Queue status pill)', () => {
  it('starts idle with no successful sync', () => {
    expect(getSyncStatus()).toEqual({ state: 'idle', lastSuccessAt: null });
  });

  it('is syncing while a sync runs, then succeeded with a timestamp', async () => {
    let unblock: () => void;
    mockPush.mockReturnValue(
      new Promise<typeof NOTHING_REFUSED>((res) => {
        unblock = () => res(NOTHING_REFUSED);
      }),
    );

    const running = synchronize();
    await Promise.resolve();
    expect(getSyncStatus().state).toBe('syncing');

    unblock!();
    await running;
    expect(getSyncStatus().state).toBe('succeeded');
    expect(getSyncStatus().lastSuccessAt).toEqual(expect.any(Number));
  });

  it('is failed after a sync error, keeping any earlier success time', async () => {
    await synchronize();
    const { lastSuccessAt } = getSyncStatus();

    mockPull.mockRejectedValue(new Error('Server error'));
    await expect(synchronize()).rejects.toThrow();

    expect(getSyncStatus()).toEqual({ state: 'failed', lastSuccessAt });
  });

  it('recovers to succeeded once a later sync works', async () => {
    mockPull.mockRejectedValueOnce(new Error('boom'));
    await expect(synchronize()).rejects.toThrow();
    expect(getSyncStatus().state).toBe('failed');

    await synchronize();
    expect(getSyncStatus().state).toBe('succeeded');
  });

  it('notifies subscribers on each change, and stops after unsubscribe', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeSyncStatus(listener);

    await synchronize();
    expect(listener).toHaveBeenCalledTimes(2); // syncing, then succeeded

    unsubscribe();
    listener.mockClear();
    await synchronize();
    expect(listener).not.toHaveBeenCalled();
  });
});

// A phone updated from a version that didn't record whose data it holds: the
// signed-in user is recorded as the owner on their next sync, so their next login
// doesn't look like a different user and wipe their unsent work.
describe('local data with no owner on record', () => {
  let mockAdopt: jest.Mock;
  let mockGetUserId: jest.Mock;

  beforeEach(() => {
    ({ adoptUnownedLocalData: mockAdopt } = require('@db/sync/localDataOwner'));
    mockGetUserId = require('@lib/auth/tokenStorage').tokenStorage.getUserId;
    mockAdopt.mockResolvedValue(undefined);
  });

  it('offers the signed-in user as the owner before anything is sent or pulled', async () => {
    const order: string[] = [];
    mockGetUserId.mockResolvedValue('user-1');
    mockAdopt.mockImplementation(async () => {
      order.push('adopt');
    });
    // Returns a summary so this test also holds once pushChanges reports refusals.
    mockPush.mockImplementation(async () => {
      order.push('push');
      return { refusedCount: 0 };
    });

    await synchronize();

    expect(mockAdopt).toHaveBeenCalledWith('user-1');
    expect(order).toEqual(['adopt', 'push']);
  });

  it('passes on "nobody signed in" as null', async () => {
    mockGetUserId.mockResolvedValue(null);

    await synchronize();

    expect(mockAdopt).toHaveBeenCalledWith(null);
  });
});

describe('resetSyncStatus', () => {
  it('forgets the last sync, and tells subscribers', async () => {
    const { resetSyncStatus } = require('@db/sync/syncManager');
    await synchronize();
    expect(getSyncStatus().state).toBe('succeeded');
    const listener = jest.fn();
    subscribeSyncStatus(listener);

    resetSyncStatus();

    expect(getSyncStatus()).toEqual({ state: 'idle', lastSuccessAt: null });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
