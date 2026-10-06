import AsyncStorage from '@react-native-async-storage/async-storage';

import { database } from '@db/database';
import { claimLocalDataFor } from '@db/sync/claimLocalData';
import { LOCAL_DATA_OWNER_KEY } from '@db/sync/localDataOwner';
import {
  FULL_PULL_NEEDED_KEY,
  LAST_SYNC_KEY,
  getSyncStatus,
  synchronize,
} from '@db/sync/syncManager';
import { apiClient } from '@lib/apiClient';
import { tokenStorage } from '@lib/auth/tokenStorage';

jest.mock('@react-native-async-storage/async-storage', (): object => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
jest.mock('@lib/auth/tokenStorage', (): object => ({
  tokenStorage: { getUserId: jest.fn() },
}));
jest.mock('@lib/apiClient', (): object => ({ apiClient: { get: jest.fn() } }));
jest.mock('@db/sync/pushChanges', (): object => ({
  pushChanges: jest.fn().mockResolvedValue({ refusedCount: 0 }),
  hasPendingActions: jest.fn().mockResolvedValue(false),
  requeueLegacyFailedActions: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@db/database', (): object => ({
  database: { get: jest.fn(), write: jest.fn(), unsafeResetDatabase: jest.fn() },
}));

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete): void => {
    resolve = complete;
  });
  return { promise, resolve };
}

function responseFor(userId: string): object {
  return {
    data: {
      timestamp: `${userId}-timestamp`,
      changes: {
        specimens: {
          created: [{ id: `${userId}-sample`, sample_uid: `${userId}-sample`, medtech_id: userId }],
          updated: [],
        },
      },
    },
  };
}

let stored: Map<string, string>;
let rows: Map<string, Record<string, unknown>[]>;
let writerTail: Promise<void>;

beforeEach((): void => {
  jest.clearAllMocks();
  stored = new Map([
    [LOCAL_DATA_OWNER_KEY, 'user-a'],
    [LAST_SYNC_KEY, 'previous-a-timestamp'],
  ]);
  rows = new Map();
  writerTail = Promise.resolve();
  jest.mocked(tokenStorage.getUserId).mockResolvedValue('user-a');
  jest
    .mocked(AsyncStorage.getItem)
    .mockImplementation(async (key): Promise<string | null> => stored.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value): Promise<void> => {
    stored.set(key, value);
  });
  jest.mocked(AsyncStorage.removeItem).mockImplementation(async (key): Promise<void> => {
    stored.delete(key);
  });
  jest.mocked(database.unsafeResetDatabase).mockImplementation(async (): Promise<void> => {
    rows.clear();
  });
  (database.write as jest.Mock).mockImplementation(
    (operation: () => Promise<void>): Promise<void> => {
      const writing = writerTail.then(operation);
      writerTail = writing.catch((): void => {});
      return writing;
    },
  );
  (database.get as jest.Mock).mockImplementation((table: string): object => {
    if (!rows.has(table)) rows.set(table, []);
    const records = rows.get(table)!;
    return {
      query: (): object => ({ fetch: async (): Promise<Record<string, unknown>[]> => records }),
      create: async (
        build: (record: Record<string, unknown>) => void,
      ): Promise<Record<string, unknown>> => {
        const record: Record<string, unknown> = {};
        build(record);
        records.push(record);
        return record;
      },
    };
  });
});

describe('switching accounts during sync', (): void => {
  it('discards a delayed response and starts the next account with its own rows and timestamp', async (): Promise<void> => {
    const requestStarted = deferred<void>();
    const oldResponse = deferred<object>();
    let oldSignal: AbortSignal | undefined;
    (apiClient.get as jest.Mock).mockImplementationOnce(
      (_url: string, config?: { signal: AbortSignal }): Promise<object> => {
        oldSignal = config?.signal;
        requestStarted.resolve();
        // Deliberately ignore cancellation, as a response can already be on its way.
        return oldResponse.promise;
      },
    );
    const oldSync = synchronize();
    await requestStarted.promise;

    const switching = claimLocalDataFor('user-b');
    await new Promise<void>((resolve): void => {
      setImmediate(resolve);
    });
    await synchronize();
    const resetsBeforeResponse = jest.mocked(database.unsafeResetDatabase).mock.calls.length;
    const requestsWhileSwitching = jest.mocked(apiClient.get).mock.calls.length;
    const wasCancelled = oldSignal?.aborted;

    oldResponse.resolve(responseFor('user-a'));
    await Promise.all([oldSync, switching]);
    expect(resetsBeforeResponse).toBe(0);
    expect(requestsWhileSwitching).toBe(1);
    expect(wasCancelled).toBe(true);
    expect(Array.from(rows.values()).flat()).toEqual([]);
    expect(stored.get(LAST_SYNC_KEY)).toBeUndefined();
    expect(stored.get(LOCAL_DATA_OWNER_KEY)).toBe('user-b');
    expect(getSyncStatus()).toEqual({ state: 'idle', lastSuccessAt: null });

    // Login hasn't saved B's session yet; a background trigger must not use A's token.
    await synchronize();
    expect(apiClient.get).toHaveBeenCalledTimes(1);
    jest.mocked(tokenStorage.getUserId).mockResolvedValue('user-b');
    (apiClient.get as jest.Mock).mockResolvedValue(responseFor('user-b'));
    await synchronize();
    expect(rows.get('specimens')).toEqual([
      expect.objectContaining({ serverId: 'user-b-sample', medtechId: 'user-b' }),
    ]);
    expect(stored.get(LAST_SYNC_KEY)).toBe('user-b-timestamp');
    expect(getSyncStatus().state).toBe('succeeded');
  });

  it('waits for an already-started timestamp write before clearing the old account metadata', async (): Promise<void> => {
    const savingTimestamp = deferred<void>();
    const finishSaving = deferred<void>();
    (apiClient.get as jest.Mock).mockResolvedValue(responseFor('user-a'));
    jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value): Promise<void> => {
      if (key === LAST_SYNC_KEY) {
        savingTimestamp.resolve();
        await finishSaving.promise;
      }
      stored.set(key, value);
    });
    const oldSync = synchronize();
    await savingTimestamp.promise;
    stored.set(FULL_PULL_NEEDED_KEY, '1');
    const switching = claimLocalDataFor('user-b');
    await new Promise<void>((resolve): void => {
      setImmediate(resolve);
    });
    const resetsBeforeSaving = jest.mocked(database.unsafeResetDatabase).mock.calls.length;

    finishSaving.resolve();
    await Promise.all([oldSync, switching]);
    expect(resetsBeforeSaving).toBe(0);
    expect(stored.get(LAST_SYNC_KEY)).toBeUndefined();
    expect(stored.get(FULL_PULL_NEEDED_KEY)).toBeUndefined();
    expect(Array.from(rows.values()).flat()).toEqual([]);
    expect(getSyncStatus()).toEqual({ state: 'idle', lastSuccessAt: null });
  });

  it('rejects an old pull that is queued behind a database writer when the account changes', async (): Promise<void> => {
    const finishWriter = deferred<void>();
    const blockedWriter = database.write(async (): Promise<void> => finishWriter.promise);
    const pullQueued = deferred<void>();
    const write = database.write as jest.Mock;
    const queueWrite = write.getMockImplementation()!;
    write.mockImplementation((operation: () => Promise<void>): Promise<void> => {
      pullQueued.resolve();
      return queueWrite(operation);
    });
    (apiClient.get as jest.Mock).mockResolvedValue(responseFor('user-a'));
    const oldSync = synchronize();
    await pullQueued.promise;
    const switching = claimLocalDataFor('user-b');
    await new Promise<void>((resolve): void => {
      setImmediate(resolve);
    });
    finishWriter.resolve();
    await Promise.all([blockedWriter, oldSync, switching]);

    // A cancelled pull must not even obtain a collection to create its records.
    expect(database.get).not.toHaveBeenCalled();
    expect(stored.get(LAST_SYNC_KEY)).toBeUndefined();
    expect(stored.get(LOCAL_DATA_OWNER_KEY)).toBe('user-b');
  });

  it('keeps same-account offline data, but never syncs while signed out or for another owner', async (): Promise<void> => {
    rows.set('specimens', [{ serverId: 'offline-work' }]);
    await claimLocalDataFor('user-a');
    expect(rows.get('specimens')).toEqual([{ serverId: 'offline-work' }]);
    expect(stored.get(LAST_SYNC_KEY)).toBe('previous-a-timestamp');

    jest.mocked(tokenStorage.getUserId).mockResolvedValue(null);
    await synchronize();
    jest.mocked(tokenStorage.getUserId).mockResolvedValue('user-b');
    await synchronize();
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(database.unsafeResetDatabase).not.toHaveBeenCalled();
  });
});
