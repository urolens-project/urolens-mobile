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
jest.mock('@lib/apiClient', () => ({ apiClient: { post: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));
jest.mock('expo-file-system', () => ({
  File: jest.fn().mockImplementation(() => ({ exists: true })),
}));
const mockBuildFieldUploadFormData = jest.fn().mockResolvedValue({});
jest.mock('@lib/camera/imageUtils', () => ({
  buildFieldUploadFormData: (...args: unknown[]) => mockBuildFieldUploadFormData(...args),
}));
jest.mock('@lib/camera/uploadField', () => ({
  uploadFieldViaXhr: jest.fn(),
  isRetakeNeededError: jest.fn().mockReturnValue(false),
}));
jest.mock('@features/field-capture/lib/saveUploadedField', () => ({
  applyFieldCaptureResponse: jest.fn(),
  discardQueuedField: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Q } from '@nozbe/watermelondb';
import {
  hasPendingActions,
  pushChanges,
  requeueLegacyFailedActions,
} from '../../src/db/sync/pushChanges';
import { database } from '../../src/db/database';
import { apiClient } from '../../src/lib/apiClient';
import { isRetakeNeededError, uploadFieldViaXhr } from '../../src/lib/camera/uploadField';
import { discardQueuedField } from '../../src/features/field-capture/lib/saveUploadedField';
import { PendingSyncAction, PendingSyncStatus } from '../../src/types/enums';
import { RETIRED_REASON } from '../../src/db/sync/legacyQueue';
import { getCurrentlyUploadingFieldId } from '../../src/db/sync/uploadStatus';

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
    expect(post).toHaveBeenCalledWith('/specimens/srv-1/start-analysis', undefined, {
      signal: undefined,
    });
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

  // The caller uses this count to re-pull everything (see syncManager.test.ts).
  describe('reports how many changes it gave up on', () => {
    it.each([
      ['a specimen now assigned to someone else', { code: 'SPECIMEN_NOT_ASSIGNED', status: 403 }],
      ['a result that can no longer be edited', { code: 'RESULT_NOT_EDITABLE', status: 409 }],
      ['a patient who refused consent', { code: 'CONSENT_REFUSED', status: 409 }],
    ])('%s is refused for good, not retried', async (_label, error) => {
      const item = makeItem();
      setDb([item]);
      post.mockRejectedValue({ ...error, message: 'refused' });

      await expect(pushChanges()).resolves.toEqual({ refusedCount: 1 });
      expect(item.status).toBe(PendingSyncStatus.FAILED);
    });

    it('counts each refused change, and only those', async () => {
      const accepted = makeItem({ entityId: 'srv-1' });
      const refused = makeItem({ entityId: 'srv-2' });
      const alsoRefused = makeItem({ entityId: 'srv-3' });
      setDb([accepted, refused, alsoRefused]);
      post
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce({ code: 'RESULT_NOT_EDITABLE', message: 'no', status: 409 })
        .mockRejectedValueOnce({ code: 'CONSENT_REFUSED', message: 'no', status: 409 });

      await expect(pushChanges()).resolves.toEqual({ refusedCount: 2 });
    });

    it('does not count a change the server had already applied', async () => {
      setDb([makeItem()]);
      post.mockRejectedValue({ code: 'RESULT_ALREADY_CONFIRMED', message: 'done', status: 409 });

      await expect(pushChanges()).resolves.toEqual({ refusedCount: 0 });
    });

    it('does not count a change that will be retried', async () => {
      setDb([makeItem()]);
      post.mockRejectedValue({ code: 'NETWORK_ERROR', message: 'offline' });

      await expect(pushChanges()).resolves.toEqual({ refusedCount: 0 });
    });

    it('counts a change given up on after a week of retries', async () => {
      setDb([makeItem({ createdAt: Date.now() - 8 * DAY })]);
      post.mockRejectedValue({ code: 'NETWORK_ERROR', message: 'offline' });

      await expect(pushChanges()).resolves.toEqual({ refusedCount: 1 });
    });

    it('reports none when there was nothing to send', async () => {
      setDb([]);

      await expect(pushChanges()).resolves.toEqual({ refusedCount: 0 });
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

  describe('an action the field workflow retired gets a clear reason, not the server 410 text', () => {
    it.each([
      PendingSyncAction.CONFIRM_RESULT,
      PendingSyncAction.OVERRIDE_PARAMETER,
      PendingSyncAction.DISCARD_IMAGE,
    ])('%s answered APP_UPDATE_REQUIRED ends FAILED with the clean-out message', async (action) => {
      const item = makeItem({ action });
      setDb([item]);
      post.mockRejectedValue({
        code: 'APP_UPDATE_REQUIRED',
        message: 'Update UroLens to continue.',
        status: 410,
      });

      await pushChanges();

      expect(item.status).toBe(PendingSyncStatus.FAILED);
      expect(item.errorMessage).toBe(RETIRED_REASON);
    });

    it('leaves an unrelated action refused with APP_UPDATE_REQUIRED showing the server message', async () => {
      const item = makeItem({ action: PendingSyncAction.ACCEPT_FIELD, entityId: 'srv-field-1' });
      (database.get as jest.Mock).mockImplementation((table: string) => {
        if (table === 'pending_sync') {
          return { query: () => ({ fetch: jest.fn().mockResolvedValue([item]) }) };
        }
        if (table === 'result_fields') {
          return { query: () => ({ fetch: jest.fn().mockResolvedValue([]) }) };
        }
        throw new Error(`unexpected table ${table}`);
      });
      (database.write as jest.Mock).mockImplementation(async (fn: () => Promise<unknown>) => fn());
      post.mockRejectedValue({
        code: 'APP_UPDATE_REQUIRED',
        message: 'Update UroLens to continue.',
        status: 410,
      });

      await pushChanges();

      expect(item.status).toBe(PendingSyncStatus.FAILED);
      expect(item.errorMessage).toBe('APP_UPDATE_REQUIRED: Update UroLens to continue.');
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

  it.each(['accepted', 'failed'] as const)(
    'leaves cancelled work pending when the old request %s, without sending another action',
    async (outcome): Promise<void> => {
      const controller = new AbortController();
      const first = makeItem({ entityId: 'srv-a' });
      const second = makeItem({ entityId: 'srv-b' });
      setDb([first, second]);
      post.mockImplementationOnce(async (): Promise<object> => {
        controller.abort();
        if (outcome === 'failed') throw { code: 'FORBIDDEN', status: 403 };
        return {};
      });

      await expect(pushChanges(controller.signal)).rejects.toThrow('Sync cancelled');

      expect(post).toHaveBeenCalledTimes(1);
      expect(post).toHaveBeenCalledWith('/specimens/srv-a/start-analysis', undefined, {
        signal: controller.signal,
      });
      expect(first.update).not.toHaveBeenCalled();
      expect(first.status).toBe(PendingSyncStatus.PENDING);
      expect(second.status).toBe(PendingSyncStatus.PENDING);
    },
  );

  it('does not update a pending action when its database writer runs after cancellation', async (): Promise<void> => {
    const controller = new AbortController();
    const item = makeItem();
    setDb([item]);
    post.mockResolvedValue({});
    (database.write as jest.Mock).mockImplementation(
      async (write: () => Promise<void>): Promise<void> => {
        controller.abort();
        await write();
      },
    );

    await expect(pushChanges(controller.signal)).rejects.toThrow('Sync cancelled');

    expect(item.update).not.toHaveBeenCalled();
    expect(item.status).toBe(PendingSyncStatus.PENDING);
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

  it('does not requeue or save retry metadata after cancellation while waiting for the writer', async (): Promise<void> => {
    const controller = new AbortController();
    const failed = makeItem({ status: PendingSyncStatus.FAILED });
    getItem.mockResolvedValue(null);
    setDb([], [failed]);
    (database.write as jest.Mock).mockImplementation(
      async (write: () => Promise<void>): Promise<void> => {
        controller.abort();
        await write();
      },
    );

    await expect(requeueLegacyFailedActions(controller.signal)).rejects.toThrow('Sync cancelled');

    expect(failed.status).toBe(PendingSyncStatus.FAILED);
    expect(failed.update).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });
});

// B2 / M14 (backend #108): the capture id lets a retried upload the phone never saw
// the answer to be recognized as the same photo, rather than analysed twice.
describe('replaying a queued field upload', () => {
  function setFieldRow(item: FakeItem, fieldRow: Record<string, unknown>) {
    (database.get as jest.Mock).mockImplementation((table: string) => {
      if (table === 'pending_sync')
        return { query: () => ({ fetch: jest.fn().mockResolvedValue([item]) }) };
      if (table === 'result_fields') return { find: jest.fn().mockResolvedValue(fieldRow) };
      throw new Error(`unexpected table ${table}`);
    });
    (database.write as jest.Mock).mockImplementation(async (fn: () => Promise<unknown>) => fn());
  }

  it('sends the capture id stored on the queued action on replay', async () => {
    const item = makeItem({
      action: PendingSyncAction.UPLOAD_IMAGE,
      entityId: 'local-field-1',
      payload: { captureId: 'capture-id-1' },
    });
    setFieldRow(item, {
      localImageUri: 'file:///fields/x.jpg',
      magnification: 'HPF',
      specimenId: 'srv-specimen-1',
    });
    (uploadFieldViaXhr as jest.Mock).mockResolvedValue({ fieldId: 'server-field-1' });

    await pushChanges();

    expect(mockBuildFieldUploadFormData).toHaveBeenCalledWith(
      expect.objectContaining({ uri: 'file:///fields/x.jpg' }),
      'srv-specimen-1',
      'HPF',
      'capture-id-1',
    );
  });

  it('replays an old queued row with no stored capture id unchanged', async () => {
    const item = makeItem({
      action: PendingSyncAction.UPLOAD_IMAGE,
      entityId: 'local-field-1',
      payload: {},
    });
    setFieldRow(item, {
      localImageUri: 'file:///fields/x.jpg',
      magnification: 'HPF',
      specimenId: 'srv-specimen-1',
    });
    (uploadFieldViaXhr as jest.Mock).mockResolvedValue({ fieldId: 'server-field-1' });

    await pushChanges();

    expect(mockBuildFieldUploadFormData).toHaveBeenCalledWith(
      expect.objectContaining({ uri: 'file:///fields/x.jpg' }),
      'srv-specimen-1',
      'HPF',
      undefined,
    );
  });
});

// The field list/thumbnail stack distinguish "uploading right now" from "merely
// queued" off this signal — it must be set only while this exact action is in
// flight, and cleared again whether the upload succeeds or fails.
describe('tracks which field is currently uploading', () => {
  function setFieldRow(item: FakeItem, fieldRow: Record<string, unknown>) {
    (database.get as jest.Mock).mockImplementation((table: string) => {
      if (table === 'pending_sync')
        return { query: () => ({ fetch: jest.fn().mockResolvedValue([item]) }) };
      if (table === 'result_fields') return { find: jest.fn().mockResolvedValue(fieldRow) };
      throw new Error(`unexpected table ${table}`);
    });
    (database.write as jest.Mock).mockImplementation(async (fn: () => Promise<unknown>) => fn());
  }

  it('is set to the field being uploaded while the request is in flight, then null on success', async () => {
    const item = makeItem({ action: PendingSyncAction.UPLOAD_IMAGE, entityId: 'local-field-1' });
    setFieldRow(item, { localImageUri: 'file:///fields/x.jpg', magnification: 'HPF' });

    let duringUpload: string | null = null;
    (uploadFieldViaXhr as jest.Mock).mockImplementation(async () => {
      duringUpload = getCurrentlyUploadingFieldId();
      return { fieldId: 'server-field-1' };
    });

    expect(getCurrentlyUploadingFieldId()).toBeNull();
    await pushChanges();

    expect(duringUpload).toBe('local-field-1');
    expect(getCurrentlyUploadingFieldId()).toBeNull();
  });

  it('is cleared back to null even when the upload fails', async () => {
    const item = makeItem({ action: PendingSyncAction.UPLOAD_IMAGE, entityId: 'local-field-1' });
    setFieldRow(item, { localImageUri: 'file:///fields/x.jpg', magnification: 'HPF' });
    (uploadFieldViaXhr as jest.Mock).mockRejectedValue({ code: 'NETWORK_ERROR', message: 'down' });

    await pushChanges();

    expect(getCurrentlyUploadingFieldId()).toBeNull();
  });
});

// A permanently-refused field decision must not leave the phone stuck (a queued
// upload with nothing left to retry) or out of step with the server (an
// optimistically-applied Accept/Discard the server never actually recorded).
describe('resolving a permanently-refused field decision', () => {
  it('discards the PENDING_UPLOAD placeholder when a queued upload is refused for good', async () => {
    const item = makeItem({
      action: PendingSyncAction.UPLOAD_IMAGE,
      entityId: 'local-field-1',
      createdAt: Date.now() - 8 * DAY,
    });
    const fieldRow = { localImageUri: 'file:///fields/x.jpg', magnification: 'HPF' };
    (database.get as jest.Mock).mockImplementation((table: string) => {
      if (table === 'pending_sync') {
        return { query: () => ({ fetch: jest.fn().mockResolvedValue([item]) }) };
      }
      if (table === 'result_fields') {
        return { find: jest.fn().mockResolvedValue(fieldRow) };
      }
      throw new Error(`unexpected table ${table}`);
    });
    (database.write as jest.Mock).mockImplementation(async (fn: () => Promise<unknown>) => fn());
    (uploadFieldViaXhr as jest.Mock).mockRejectedValue({
      status: 403,
      code: 'SPECIMEN_NOT_ASSIGNED',
      message: 'This sample is no longer assigned to you.',
    });

    await pushChanges();

    expect(discardQueuedField).toHaveBeenCalledWith(
      'local-field-1',
      expect.stringContaining('SPECIMEN_NOT_ASSIGNED'),
    );
  });

  it.each([PendingSyncAction.ACCEPT_FIELD, PendingSyncAction.DISCARD_FIELD])(
    'reverts the field back to ANALYZED when a queued %s is refused for good',
    async (action) => {
      const item = makeItem({ action, entityId: 'srv-field-1', createdAt: Date.now() - 8 * DAY });
      const fieldRow = {
        status: action === PendingSyncAction.ACCEPT_FIELD ? 'ACCEPTED' : 'DISCARDED',
        isSynced: false,
        syncedAt: null,
        update: jest.fn(async (cb: (f: typeof fieldRow) => void) => cb(fieldRow)),
      };
      (database.get as jest.Mock).mockImplementation((table: string) => {
        if (table === 'pending_sync') {
          return { query: () => ({ fetch: jest.fn().mockResolvedValue([item]) }) };
        }
        if (table === 'result_fields') {
          return { query: () => ({ fetch: jest.fn().mockResolvedValue([fieldRow]) }) };
        }
        throw new Error(`unexpected table ${table}`);
      });
      (database.write as jest.Mock).mockImplementation(async (fn: () => Promise<unknown>) => fn());
      post.mockRejectedValue({
        status: 403,
        code: 'SPECIMEN_NOT_ASSIGNED',
        message: 'This sample is no longer assigned to you.',
      });

      await pushChanges();

      expect(fieldRow.status).toBe('ANALYZED');
      expect(fieldRow.isSynced).toBe(true);
    },
  );
});

// M8 (mobile-n8-todo-rem.md): the exact queued-action outcomes the multi-field
// workflow's backend contract specifies — each a concrete instance of the generic
// transient/permanent rules already covered above, pinned to the literal codes so a
// future change to isTransient or the retake-detection list is caught here too.
describe('M8: queued field action outcomes', () => {
  function setFieldRow(item: FakeItem, fieldRow: Record<string, unknown>) {
    (database.get as jest.Mock).mockImplementation((table: string) => {
      if (table === 'pending_sync') {
        return { query: () => ({ fetch: jest.fn().mockResolvedValue([item]) }) };
      }
      if (table === 'result_fields') return { find: jest.fn().mockResolvedValue(fieldRow) };
      throw new Error(`unexpected table ${table}`);
    });
    (database.write as jest.Mock).mockImplementation(async (fn: () => Promise<unknown>) => fn());
  }

  it.each([
    ['RESULT_NOT_EDITABLE', 409],
    ['SPECIMEN_REJECTED', 409],
    ['CONSENT_REFUSED', 409],
  ])('discards the queued upload when the server refuses it with %s (%i)', async (code, status) => {
    const item = makeItem({ action: PendingSyncAction.UPLOAD_IMAGE, entityId: 'local-field-1' });
    setFieldRow(item, { localImageUri: 'file:///fields/x.jpg', magnification: 'HPF' });
    (uploadFieldViaXhr as jest.Mock).mockRejectedValue({ status, code, message: 'refused' });

    await pushChanges();

    expect(discardQueuedField).toHaveBeenCalledWith('local-field-1', expect.stringContaining(code));
  });

  it.each(['IMAGE_NOT_MICROSCOPY', 'IMAGE_EXPOSURE'])(
    'discards the queued upload when the engine gate refuses it with %s (422)',
    async (code) => {
      const item = makeItem({ action: PendingSyncAction.UPLOAD_IMAGE, entityId: 'local-field-1' });
      setFieldRow(item, { localImageUri: 'file:///fields/x.jpg', magnification: 'HPF' });
      const err = { status: 422, code, message: 'retake needed' };
      (uploadFieldViaXhr as jest.Mock).mockRejectedValue(err);
      (isRetakeNeededError as jest.Mock).mockReturnValueOnce(true);

      await pushChanges();

      expect(discardQueuedField).toHaveBeenCalledWith('local-field-1', 'retake needed');
      // Resolved, not stuck: the queued action itself is marked SYNCED, not FAILED.
      expect(item.status).toBe(PendingSyncStatus.SYNCED);
    },
  );

  it('retries a queued upload the server answers with 503 AI_ANALYSIS_FAILED', async () => {
    const item = makeItem({ action: PendingSyncAction.UPLOAD_IMAGE, entityId: 'local-field-1' });
    setFieldRow(item, { localImageUri: 'file:///fields/x.jpg', magnification: 'HPF' });
    (uploadFieldViaXhr as jest.Mock).mockRejectedValue({
      status: 503,
      code: 'AI_ANALYSIS_FAILED',
      message: 'The AI engine could not process this image.',
    });

    await pushChanges();

    expect(item.status).toBe(PendingSyncStatus.PENDING);
    expect(discardQueuedField).not.toHaveBeenCalled();
  });

  it.each([
    ['INVALID_RESULT_STATUS', 409],
    ['REASON_REQUIRED', 422],
  ])(
    'puts a queued Accept/Discard field decision back to ANALYZED when refused with %s (%i)',
    async (code, status) => {
      const item = makeItem({ action: PendingSyncAction.ACCEPT_FIELD, entityId: 'srv-field-1' });
      const fieldRow = {
        status: 'ACCEPTED',
        isSynced: false,
        syncedAt: null,
        update: jest.fn(async (cb: (f: typeof fieldRow) => void) => cb(fieldRow)),
      };
      (database.get as jest.Mock).mockImplementation((table: string) => {
        if (table === 'pending_sync') {
          return { query: () => ({ fetch: jest.fn().mockResolvedValue([item]) }) };
        }
        if (table === 'result_fields') {
          return { query: () => ({ fetch: jest.fn().mockResolvedValue([fieldRow]) }) };
        }
        throw new Error(`unexpected table ${table}`);
      });
      (database.write as jest.Mock).mockImplementation(async (fn: () => Promise<unknown>) => fn());
      post.mockRejectedValue({ status, code, message: 'refused' });

      await pushChanges();

      expect(fieldRow.status).toBe('ANALYZED');
    },
  );
});
