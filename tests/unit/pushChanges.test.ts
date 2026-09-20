/**
 * pushChanges: sending queued changes to the server, and what happens when that fails.
 *
 * A change that failed for a temporary reason (no network, timeout, server error,
 * expired session) must be tried again on the next sync — not silently dropped. One
 * the server actively refused will fail the same way every time, so it's marked
 * FAILED instead of being retried forever.
 */

jest.mock('@nozbe/watermelondb', () => ({
  Model: class {},
  Q: {
    where: jest.fn((field: string, value: unknown) => ({ field, value })),
    sortBy: jest.fn((field: string, dir: string) => ({ sortBy: field, dir })),
    asc: 'asc',
  },
}));
jest.mock('@db/database', () => ({ database: { get: jest.fn(), write: jest.fn() } }));
jest.mock('@lib/apiClient', () => ({ __esModule: true, default: { post: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Q } from '@nozbe/watermelondb';
import {
  hasPendingActions,
  pushChanges,
  requeueLegacyFailedActions,
} from '../../src/db/sync/pushChanges';
import { database } from '../../src/db/database';
import apiClient from '../../src/lib/apiClient';
import { PendingSyncAction, PendingSyncStatus } from '../../src/types/enums';

const post = apiClient.post as jest.Mock;
const DAY = 24 * 60 * 60 * 1000;

interface FakeItem {
  action: string;
  entityId: string;
  payload: Record<string, unknown>;
  status: string;
  errorMessage: string | null;
  attemptedAt: number | null;
  createdAt: number;
  update: jest.Mock;
}

function makeItem(overrides: Partial<FakeItem> = {}): FakeItem {
  const item: FakeItem = {
    action: PendingSyncAction.START_ANALYSIS,
    entityId: 'srv-1',
    payload: {},
    status: PendingSyncStatus.PENDING,
    errorMessage: null,
    attemptedAt: null,
    createdAt: Date.now() - 1000,
    update: jest.fn(),
    ...overrides,
  };
  item.update.mockImplementation(async (cb: (r: FakeItem) => void) => cb(item));
  return item;
}

function setDb(pending: FakeItem[], failed: FakeItem[] = []) {
  (database.get as jest.Mock).mockReturnValue({
    query: jest.fn((...clauses: { field?: string; value?: unknown }[]) => {
      const wantsFailed = clauses.some((c) => c.value === PendingSyncStatus.FAILED);
      const rows = wantsFailed ? failed : pending;
      return {
        fetch: jest.fn().mockResolvedValue(rows),
        fetchCount: jest.fn().mockResolvedValue(rows.length),
      };
    }),
  });
  (database.write as jest.Mock).mockImplementation(async (fn: () => Promise<unknown>) => fn());
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

describe('pushChanges', () => {
  it('marks a change SYNCED once the server accepts it', async () => {
    const item = makeItem();
    setDb([item]);
    post.mockResolvedValue({});
    await pushChanges();
    expect(post).toHaveBeenCalledWith('/specimens/srv-1/start-analysis');
    expect(item.status).toBe(PendingSyncStatus.SYNCED);
  });

  it('sends changes oldest first, so they reach the server in the order they were made', async () => {
    setDb([]);
    await pushChanges();
    expect(Q.sortBy).toHaveBeenCalledWith('created_at', 'asc');
  });

  describe('temporary failures stay queued and are retried', () => {
    it.each([
      ['no network', { code: 'NETWORK_ERROR', message: 'Unable to reach the server.' }],
      ['a timeout', { code: 'TIMEOUT', message: 'The request timed out.' }],
      ['a server error', { code: 'UNKNOWN_ERROR', message: 'boom', status: 503 }],
      ['rate limiting', { code: 'RATE_LIMITED', message: 'slow down', status: 429 }],
      ['an expired session', { code: 'UNAUTHORIZED', message: 'expired', status: 401 }],
    ])('%s', async (_label, error) => {
      const item = makeItem();
      setDb([item]);
      post.mockRejectedValue(error);

      await pushChanges();

      expect(item.status).toBe(PendingSyncStatus.PENDING); // picked up again next sync
      expect(item.errorMessage).toBe(`${error.code}: ${error.message}`);
      expect(item.attemptedAt).toEqual(expect.any(Number));
    });

    it('gives up after a week, so a change cannot retry forever', async () => {
      const item = makeItem({ createdAt: Date.now() - 8 * DAY });
      setDb([item]);
      post.mockRejectedValue({ code: 'NETWORK_ERROR', message: 'Unable to reach the server.' });

      await pushChanges();

      expect(item.status).toBe(PendingSyncStatus.FAILED);
    });
  });

  describe('changes the server refuses are marked FAILED, not retried', () => {
    it.each([
      ['validation', { code: 'VALIDATION_ERROR', message: 'bad', status: 422 }],
      ['forbidden', { code: 'SPECIMEN_NOT_ASSIGNED', message: 'not yours', status: 403 }],
      ['not startable', { code: 'SPECIMEN_NOT_STARTABLE', message: 'completed', status: 409 }],
      ['not found', { code: 'NOT_FOUND', message: 'gone', status: 404 }],
    ])('%s', async (_label, error) => {
      const item = makeItem();
      setDb([item]);
      post.mockRejectedValue(error);

      await pushChanges();

      expect(item.status).toBe(PendingSyncStatus.FAILED);
      expect(item.errorMessage).toBe(`${error.code}: ${error.message}`);
    });

    it('records a readable message, not "[object Object]"', async () => {
      const item = makeItem();
      setDb([item]);
      post.mockRejectedValue({ code: 'VALIDATION_ERROR', message: 'bad', status: 422 });
      await pushChanges();
      expect(item.errorMessage).not.toContain('[object Object]');
    });

    it('fails an unknown action rather than retrying it', async () => {
      const item = makeItem({ action: 'MYSTERY_ACTION' });
      setDb([item]);
      await pushChanges();
      expect(item.status).toBe(PendingSyncStatus.FAILED);
      expect(item.errorMessage).toContain('Unknown sync action');
    });
  });

  describe('"already done" replies count as success', () => {
    it.each(['CONFLICT', 'SPECIMEN_ALREADY_REJECTED', 'RESULT_ALREADY_CONFIRMED'])(
      '%s',
      async (code) => {
        const item = makeItem();
        setDb([item]);
        post.mockRejectedValue({ code, message: 'already', status: 409 });
        await pushChanges();
        expect(item.status).toBe(PendingSyncStatus.SYNCED);
      },
    );
  });

  it('one failing change does not stop the rest from being sent', async () => {
    const first = makeItem({ entityId: 'srv-a' });
    const second = makeItem({ entityId: 'srv-b' });
    setDb([first, second]);
    post
      .mockRejectedValueOnce({ code: 'NETWORK_ERROR', message: 'down' })
      .mockResolvedValueOnce({});

    await pushChanges();

    expect(first.status).toBe(PendingSyncStatus.PENDING);
    expect(second.status).toBe(PendingSyncStatus.SYNCED);
  });
});

describe('hasPendingActions', () => {
  it('is true while a change is waiting to be sent', async () => {
    setDb([makeItem()]);
    expect(await hasPendingActions()).toBe(true);
  });

  it('is false when nothing is waiting', async () => {
    setDb([]);
    expect(await hasPendingActions()).toBe(false);
  });
});

describe('requeueLegacyFailedActions', () => {
  const getItem = AsyncStorage.getItem as jest.Mock;
  const setItem = AsyncStorage.setItem as jest.Mock;

  it('gives recently-FAILED changes one more try, and remembers it did', async () => {
    getItem.mockResolvedValue(null);
    const recent = makeItem({ status: PendingSyncStatus.FAILED, createdAt: Date.now() - DAY });
    setDb([], [recent]);

    await requeueLegacyFailedActions();

    expect(recent.status).toBe(PendingSyncStatus.PENDING);
    expect(setItem).toHaveBeenCalledWith('urolens_failed_actions_requeued_v1', '1');
  });

  it('leaves changes older than a week alone', async () => {
    getItem.mockResolvedValue(null);
    const old = makeItem({ status: PendingSyncStatus.FAILED, createdAt: Date.now() - 9 * DAY });
    setDb([], [old]);

    await requeueLegacyFailedActions();

    expect(old.status).toBe(PendingSyncStatus.FAILED);
  });

  it('does nothing the second time', async () => {
    getItem.mockResolvedValue('1');
    const failed = makeItem({ status: PendingSyncStatus.FAILED });
    setDb([], [failed]);

    await requeueLegacyFailedActions();

    expect(failed.status).toBe(PendingSyncStatus.FAILED);
    expect(setItem).not.toHaveBeenCalled();
  });
});
