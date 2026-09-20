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
}));

jest.mock('@db/sync/pullChanges', () => ({
  pullChanges: jest.fn(),
}));

jest.mock('@db/sync/pushChanges', () => ({
  pushChanges: jest.fn(),
  hasPendingActions: jest.fn(),
  requeueLegacyFailedActions: jest.fn(),
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

  mockPull.mockResolvedValue('2026-05-26T10:00:00Z');
  mockPush.mockResolvedValue(undefined);
  mockHasPending.mockResolvedValue(false);
  mockRequeue.mockResolvedValue(undefined);
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
});

describe('synchronize', () => {
  it('calls pushChanges before pullChanges (push-then-pull order)', async () => {
    const order: string[] = [];
    mockPush.mockImplementation(async () => {
      order.push('push');
    });
    mockPull.mockImplementation(async () => {
      order.push('pull');
      return '2026-05-26T10:00:00Z';
    });

    await synchronize();

    expect(order).toEqual(['push', 'pull']);
  });

  it('passes lastSyncedAt from AsyncStorage to pullChanges', async () => {
    mockGetItem.mockResolvedValue('2026-05-25T08:00:00Z');

    await synchronize();

    expect(mockPull).toHaveBeenCalledWith('2026-05-25T08:00:00Z');
  });

  it('passes null to pullChanges when AsyncStorage has no timestamp', async () => {
    mockGetItem.mockResolvedValue(null);

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
    const blocker = new Promise<void>((res) => {
      unblockPush = res;
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
      new Promise<void>((res) => {
        unblockPush = res;
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
    mockGetItem.mockResolvedValue(null);
    mockHasPending.mockResolvedValue(false);

    await synchronize();

    expect(mockReset).toHaveBeenCalledTimes(1);
  });

  // The reset erases pending_sync too — with retries, unsent changes can now
  // outlive a sync, so it must not run while any are still waiting.
  it('does NOT reset the local database while changes are still waiting to be sent', async () => {
    mockGetItem.mockResolvedValue(null);
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
    });

    await synchronize();

    expect(order).toEqual(['requeue', 'push']);
  });
});

describe('sync status (drives the Queue status pill)', () => {
  it('starts idle with no successful sync', () => {
    expect(getSyncStatus()).toEqual({ state: 'idle', lastSuccessAt: null });
  });

  it('is syncing while a sync runs, then succeeded with a timestamp', async () => {
    let unblock: () => void;
    mockPush.mockReturnValue(
      new Promise<void>((res) => {
        unblock = res;
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
