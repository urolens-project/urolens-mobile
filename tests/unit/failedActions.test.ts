/**
 * failedActions: the queued changes the server refused (UROLENS-220).
 *
 * Covers:
 *  - failedActionsQuery: FAILED only, newest first
 *  - dismissFailedActions: marks them DISMISSED (kept, not deleted); no write when none
 *  - findSampleUid: via the specimen, via the result's specimen (confirm and override),
 *    by server id or local id, and null when it can't be worked out
 */

jest.mock('@nozbe/watermelondb', () => ({
  Model: class {},
  Q: {
    where: jest.fn((field: string, value: unknown) => ({ field, value })),
    or: jest.fn((...clauses: unknown[]) => ({ or: clauses })),
    sortBy: jest.fn((field: string, dir: string) => ({ sortBy: field, dir })),
    desc: 'desc',
  },
}));
jest.mock('@db/database', () => ({ database: { get: jest.fn(), write: jest.fn() } }));

import { Q } from '@nozbe/watermelondb';

import { database } from '../../src/db/database';
import {
  dismissFailedActions,
  failedActionsQuery,
  findSampleUid,
} from '../../src/db/sync/failedActions';
import type PendingSync from '../../src/db/models/PendingSync';
import { PendingSyncStatus } from '../../src/types/enums';

interface Row {
  id: string;
  serverId?: string | null;
  [key: string]: unknown;
}

// Each table answers a query for `server_id = x OR id = x` from its rows, matching
// each condition against its own column only.
function setTables(tables: Record<string, Row[]>): void {
  (database.get as jest.Mock).mockImplementation((table: string) => ({
    query: jest.fn((...clauses: { or?: { field: string; value: unknown }[] }[]) => {
      const conditions = clauses.find((c) => c.or)?.or ?? null;
      const rows = tables[table] ?? [];
      const matches = conditions
        ? rows.filter((r) =>
            conditions.some((c) => (c.field === 'server_id' ? r.serverId : r.id) === c.value),
          )
        : rows;
      return { fetch: jest.fn().mockResolvedValue(matches) };
    }),
  }));
  (database.write as jest.Mock).mockImplementation(async (fn: () => Promise<unknown>) => fn());
}

function failedItem(overrides: Partial<PendingSync> = {}): PendingSync {
  const item = {
    id: 'q1',
    entity: 'specimens',
    entityId: 'srv-spec-1',
    status: PendingSyncStatus.FAILED,
    update: jest.fn(),
    ...overrides,
  };
  item.update.mockImplementation(async (cb: (r: typeof item) => void) => cb(item));
  return item as unknown as PendingSync;
}

beforeEach(() => jest.clearAllMocks());

describe('failedActionsQuery', () => {
  it('asks for the refused changes only, newest first', () => {
    setTables({});

    failedActionsQuery();

    expect(Q.where).toHaveBeenCalledWith('status', PendingSyncStatus.FAILED);
    expect(Q.sortBy).toHaveBeenCalledWith('created_at', 'desc');
    expect(database.get).toHaveBeenCalledWith('pending_sync');
  });
});

describe('dismissFailedActions', () => {
  it('marks every refused change DISMISSED, keeping the record', async () => {
    const first = failedItem({ id: 'q1' });
    const second = failedItem({ id: 'q2' });
    setTables({ pending_sync: [first as unknown as Row, second as unknown as Row] });

    await dismissFailedActions();

    expect(first.status).toBe(PendingSyncStatus.DISMISSED);
    expect(second.status).toBe(PendingSyncStatus.DISMISSED);
    expect(database.write).toHaveBeenCalledTimes(1);
  });

  it('writes nothing when there is nothing to dismiss', async () => {
    setTables({ pending_sync: [] });

    await dismissFailedActions();

    expect(database.write).not.toHaveBeenCalled();
  });
});

describe('findSampleUid', () => {
  const tables = {
    specimens: [
      { id: 'local-spec-1', serverId: 'srv-spec-1', sampleUid: 'SMP-20261003-00001' },
      { id: 'local-spec-2', serverId: null, sampleUid: 'SMP-20261003-00002' },
    ],
    analysis_results: [
      { id: 'local-res-1', serverId: 'srv-res-1', specimenId: 'srv-spec-1' },
      { id: 'local-res-2', serverId: null, specimenId: 'local-spec-2' },
      { id: 'local-res-3', serverId: 'srv-res-3', specimenId: 'srv-spec-gone' },
    ],
  };

  beforeEach(() => setTables(tables));

  it('a specimen change (reject, begin analysis) names its own sample', async () => {
    await expect(
      findSampleUid(failedItem({ entity: 'specimens', entityId: 'srv-spec-1' })),
    ).resolves.toBe('SMP-20261003-00001');
  });

  it("a confirm names its result's sample", async () => {
    await expect(
      findSampleUid(failedItem({ entity: 'analysis_results', entityId: 'srv-res-1' })),
    ).resolves.toBe('SMP-20261003-00001');
  });

  it("an override names its result's sample", async () => {
    await expect(
      findSampleUid(failedItem({ entity: 'manual_override', entityId: 'srv-res-1' })),
    ).resolves.toBe('SMP-20261003-00001');
  });

  it('finds records queued under their local id (never synced)', async () => {
    await expect(
      findSampleUid(failedItem({ entity: 'analysis_results', entityId: 'local-res-2' })),
    ).resolves.toBe('SMP-20261003-00002');
  });

  it.each([
    ['the result is no longer on the phone', 'analysis_results', 'srv-res-missing'],
    ["the result's sample is no longer on the phone", 'analysis_results', 'srv-res-3'],
    ['the specimen is no longer on the phone', 'specimens', 'srv-spec-missing'],
    ['the change was about an image', 'images', 'img-1'],
  ])('is null when %s', async (_label, entity, entityId) => {
    await expect(findSampleUid(failedItem({ entity, entityId }))).resolves.toBeNull();
  });
});
