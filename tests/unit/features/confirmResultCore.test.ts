// Critical-path tests for the shared confirm-result logic used by both
// useResultConfirmation (post-capture review screen) and useConfirmAction
// (queue-revisit / supervisor override screen), so behavior can't drift
// apart between the two consumers again.
import { confirmResultCore } from '@features/result-confirmation/lib/confirmResultCore';
import { database } from '@db/database';
import { apiClient } from '@lib/apiClient';
import { synchronize } from '@db/sync/syncManager';
import { PendingSyncAction, PendingSyncStatus, ResultStatus } from '@app-types/enums';

jest.mock('@db/database', () => ({
  database: {
    get: jest.fn(),
    write: jest.fn((fn: () => Promise<void>) => fn()),
  },
}));

jest.mock('@lib/apiClient', () => ({
  __esModule: true,
  apiClient: { post: jest.fn() },
}));

jest.mock('@db/sync/syncManager', () => ({
  synchronize: jest.fn(() => Promise.resolve()),
}));

const mockCreate = jest.fn();
const mockUpdate = jest.fn();

function makeResult(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'local-1',
    serverId: 'server-1',
    update: mockUpdate,
    ...overrides,
  } as unknown as Parameters<typeof confirmResultCore>[0]['result'];
}

beforeEach(() => {
  jest.clearAllMocks();
  (database.get as jest.Mock).mockImplementation((table: string) => {
    if (table === 'pending_sync') return { create: mockCreate };
    return {};
  });
  mockUpdate.mockImplementation(async (fn: (r: Record<string, unknown>) => void) => {
    const row: Record<string, unknown> = {};
    fn(row);
    return row;
  });
  (apiClient.post as jest.Mock).mockResolvedValue({ data: {} });
});

describe('confirmResultCore', () => {
  describe('online, serverId present', () => {
    it('posts to /results/{serverId}/confirm and triggers a sync so Smart Diagnosis appears immediately', async () => {
      const result = makeResult();
      await confirmResultCore({ result, isOnline: true });

      expect(apiClient.post).toHaveBeenCalledWith('/results/server-1/confirm', {});
      expect(synchronize).toHaveBeenCalledTimes(1);
    });

    it('marks the result PENDING_SUPERVISOR_APPROVAL and synced', async () => {
      const result = makeResult();
      await confirmResultCore({ result, isOnline: true });

      expect(mockUpdate).toHaveBeenCalledTimes(1);
      const updateFn = mockUpdate.mock.calls[0][0];
      const row: Record<string, unknown> = {};
      updateFn(row);
      expect(row.status).toBe(ResultStatus.PENDING_SUPERVISOR_APPROVAL);
      expect(row.isSynced).toBe(true);
    });

    it('does not create a pending_sync row', async () => {
      const result = makeResult();
      await confirmResultCore({ result, isOnline: true });
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('treats a 409 RESULT_ALREADY_CONFIRMED error as success (still syncs and updates status)', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue({ code: 'RESULT_ALREADY_CONFIRMED' });
      const result = makeResult();

      await expect(confirmResultCore({ result, isOnline: true })).resolves.toBeUndefined();
      expect(synchronize).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledTimes(1);
    });

    it('propagates any other API error without syncing or updating local status', async () => {
      (apiClient.post as jest.Mock).mockRejectedValue({ code: 'SERVER_ERROR', message: 'boom' });
      const result = makeResult();

      await expect(confirmResultCore({ result, isOnline: true })).rejects.toEqual(
        expect.objectContaining({ code: 'SERVER_ERROR' }),
      );
      expect(synchronize).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('offline, or no serverId yet', () => {
    it('does not call the API or synchronize when offline', async () => {
      const result = makeResult();
      await confirmResultCore({ result, isOnline: false });

      expect(apiClient.post).not.toHaveBeenCalled();
      expect(synchronize).not.toHaveBeenCalled();
    });

    it('queues a pending_sync row with the consolidated entity name', async () => {
      const result = makeResult();
      await confirmResultCore({ result, isOnline: false });

      expect(mockCreate).toHaveBeenCalledTimes(1);
      const createFn = mockCreate.mock.calls[0][0];
      const row: Record<string, unknown> = {};
      createFn(row);
      expect(row.entity).toBe('analysis_results');
      expect(row.entityId).toBe('server-1');
      expect(row.action).toBe(PendingSyncAction.CONFIRM_RESULT);
      expect(row.status).toBe(PendingSyncStatus.PENDING);
    });

    it('falls back to the local id as entityId when serverId is null (never synced yet)', async () => {
      const result = makeResult({ serverId: null });
      await confirmResultCore({ result, isOnline: true });

      expect(apiClient.post).not.toHaveBeenCalled();
      const createFn = mockCreate.mock.calls[0][0];
      const row: Record<string, unknown> = {};
      createFn(row);
      expect(row.entityId).toBe('local-1');
    });

    it('marks the result unsynced', async () => {
      const result = makeResult();
      await confirmResultCore({ result, isOnline: false });

      const updateFn = mockUpdate.mock.calls[0][0];
      const row: Record<string, unknown> = {};
      updateFn(row);
      expect(row.isSynced).toBe(false);
    });
  });
});
