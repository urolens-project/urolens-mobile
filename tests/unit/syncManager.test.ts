// Path: urolens-mobile/tests/unit/syncManager.test.ts
// Tests syncManager in isolation by resetting module state between each test
// so the module-level isSyncing guard starts false every time.

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('@db/sync/pullChanges', () => ({
  pullChanges: jest.fn(),
}));

jest.mock('@db/sync/pushChanges', () => ({
  pushChanges: jest.fn(),
}));

// Fresh module + fresh mock instances per test (resets isSyncing = false)
let synchronize: () => Promise<void>;
let getIsSyncing: () => boolean;
let mockPull: jest.Mock;
let mockPush: jest.Mock;
let mockGetItem: jest.Mock;
let mockSetItem: jest.Mock;

beforeEach(() => {
  jest.resetModules();

  ({ synchronize, getIsSyncing } = require('@db/sync/syncManager'));
  ({ pullChanges: mockPull }     = require('@db/sync/pullChanges'));
  ({ pushChanges: mockPush }     = require('@db/sync/pushChanges'));

  const as   = require('@react-native-async-storage/async-storage');
  mockGetItem = as.getItem;
  mockSetItem = as.setItem;

  mockPull.mockResolvedValue('2026-05-26T10:00:00Z');
  mockPush.mockResolvedValue(undefined);
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
});

describe('synchronize', () => {
  it('calls pushChanges before pullChanges (push-then-pull order)', async () => {
    const order: string[] = [];
    mockPush.mockImplementation(async () => { order.push('push'); });
    mockPull.mockImplementation(async () => { order.push('pull'); return '2026-05-26T10:00:00Z'; });

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

    expect(mockSetItem).toHaveBeenCalledWith(
      'urolens_last_sync_at',
      '2026-05-26T12:00:00Z',
    );
  });

  it('does not save timestamp when pullChanges returns falsy', async () => {
    mockPull.mockResolvedValue(null as unknown as string);

    await synchronize();

    expect(mockSetItem).not.toHaveBeenCalled();
  });

  it('skips a concurrent call while a sync is already in progress', async () => {
    let unblockPush: () => void;
    const blocker = new Promise<void>((res) => { unblockPush = res; });
    mockPush.mockReturnValue(blocker);

    const first = synchronize();   // starts, stalls at pushChanges
    await synchronize();           // should return immediately (guard)

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
    mockPush.mockReturnValue(new Promise<void>((res) => { unblockPush = res; }));

    const syncPromise = synchronize();
    expect(getIsSyncing()).toBe(true);

    unblockPush!();
    await syncPromise;
    expect(getIsSyncing()).toBe(false);
  });
});
