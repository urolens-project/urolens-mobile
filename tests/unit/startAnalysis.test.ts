/**
 * Unit tests for startAnalysis — "Begin Analysis" makes a specimen In Progress.
 *
 *  - Online: tells the server, flips local status to PROCESSING, queues nothing
 *  - Offline: queues a START_ANALYSIS pending_sync row, flips local status
 *  - Online but the request fails: falls back to queueing (nothing is lost)
 *  - pushChanges replays the queued action against the server
 */

jest.mock('@nozbe/watermelondb', () => ({
  Model: class {},
  Q: { where: jest.fn(), sortBy: jest.fn(), asc: 'asc' },
}));
jest.mock('@db/database', () => ({ database: { get: jest.fn(), write: jest.fn() } }));
jest.mock('@lib/apiClient', () => {
  const post = jest.fn();
  return { __esModule: true, default: { post }, apiClient: { post } };
});

import { startAnalysis } from '../../src/features/queue/lib/startAnalysis';
import { pushChanges } from '../../src/db/sync/pushChanges';
import { database } from '../../src/db/database';
import apiClient from '../../src/lib/apiClient';
import { PendingSyncAction, PendingSyncStatus } from '../../src/types/enums';

const post = apiClient.post as jest.Mock;

function setupDb() {
  const specimen = {
    status: 'ASSIGNED',
    update: jest.fn().mockImplementation(async (cb: (s: Record<string, unknown>) => void) => {
      cb(specimen as unknown as Record<string, unknown>);
    }),
  };
  const pendingRows: Record<string, unknown>[] = [];
  const pendingCreate = jest
    .fn()
    .mockImplementation(async (cb: (r: Record<string, unknown>) => void) => {
      const row: Record<string, unknown> = {};
      cb(row);
      pendingRows.push(row);
    });

  (database.get as jest.Mock).mockImplementation((table: string) =>
    table === 'specimens'
      ? { find: jest.fn().mockResolvedValue(specimen) }
      : { create: pendingCreate },
  );
  (database.write as jest.Mock).mockImplementation(async (fn: () => Promise<unknown>) => fn());
  return { specimen, pendingRows };
}

beforeEach(() => jest.clearAllMocks());

describe('startAnalysis', () => {
  it('online: posts to the server, sets PROCESSING, and queues nothing', async () => {
    const { specimen, pendingRows } = setupDb();
    post.mockResolvedValue({});
    await startAnalysis({ specimenId: 'local-1', serverId: 'srv-1', isOnline: true });
    expect(post).toHaveBeenCalledWith('/specimens/srv-1/start-analysis');
    expect(specimen.status).toBe('PROCESSING');
    expect(pendingRows).toHaveLength(0);
  });

  it('offline: queues a START_ANALYSIS action without calling the server', async () => {
    const { specimen, pendingRows } = setupDb();
    await startAnalysis({ specimenId: 'local-1', serverId: 'srv-1', isOnline: false });
    expect(post).not.toHaveBeenCalled();
    expect(specimen.status).toBe('PROCESSING');
    expect(pendingRows).toEqual([
      expect.objectContaining({
        entity: 'specimens',
        entityId: 'srv-1',
        action: PendingSyncAction.START_ANALYSIS,
        status: PendingSyncStatus.PENDING,
      }),
    ]);
  });

  it('online but the request fails: still sets PROCESSING and queues the action', async () => {
    const { specimen, pendingRows } = setupDb();
    post.mockRejectedValue({ code: 'NETWORK_ERROR', message: 'x' });
    await startAnalysis({ specimenId: 'local-1', serverId: 'srv-1', isOnline: true });
    expect(specimen.status).toBe('PROCESSING');
    expect(pendingRows).toHaveLength(1);
    expect(pendingRows[0].action).toBe(PendingSyncAction.START_ANALYSIS);
  });
});

describe('pushChanges START_ANALYSIS', () => {
  it('replays a queued START_ANALYSIS against the server and marks it SYNCED', async () => {
    const item = {
      action: PendingSyncAction.START_ANALYSIS,
      entityId: 'srv-1',
      createdAt: Date.now(),
      payload: {},
      update: jest.fn().mockImplementation(async (cb: (r: Record<string, unknown>) => void) => {
        cb(item as unknown as Record<string, unknown>);
      }),
      status: PendingSyncStatus.PENDING,
    };
    (database.get as jest.Mock).mockReturnValue({
      query: jest.fn().mockReturnValue({ fetch: jest.fn().mockResolvedValue([item]) }),
    });
    (database.write as jest.Mock).mockImplementation(async (fn: () => Promise<unknown>) => fn());
    post.mockResolvedValue({});

    await pushChanges();

    expect(post).toHaveBeenCalledWith('/specimens/srv-1/start-analysis');
    expect(item.status).toBe(PendingSyncStatus.SYNCED);
  });
});
