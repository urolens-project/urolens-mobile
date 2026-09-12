/**
 * Unit tests for dedupeByServerId — the cleanup pass added after a real bug:
 * processCreates() could insert a second local row for a specimen the
 * client already had (a replayed/resent "created" batch), which showed up
 * as duplicated patient cards in the Queue and, once only one copy kept
 * receiving updates, an occasional "Sample not found" on the stale one.
 */

jest.mock('@db/database', () => ({ database: { get: jest.fn() } }));

import { dedupeByServerId } from '../../src/db/sync/dedupeByServerId';
import { database } from '../../src/db/database';

function makeRecord(overrides: {
  serverId: string | null;
  syncedAt?: string | null;
  syncStatus?: string;
}) {
  return {
    serverId: overrides.serverId,
    syncedAt: overrides.syncedAt ?? null,
    syncStatus: overrides.syncStatus ?? 'synced',
    destroyPermanently: jest.fn(async () => {}),
  };
}

function mockCollection(records: ReturnType<typeof makeRecord>[]) {
  (database.get as jest.Mock).mockReturnValue({
    query: () => ({ fetch: async () => records }),
  });
  return records;
}

describe('dedupeByServerId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing when every record has a distinct server_id', async () => {
    const records = mockCollection([
      makeRecord({ serverId: 'srv-1' }),
      makeRecord({ serverId: 'srv-2' }),
    ]);

    const removed = await dedupeByServerId('specimens');

    expect(removed).toBe(0);
    records.forEach((r) => expect(r.destroyPermanently).not.toHaveBeenCalled());
  });

  it('ignores records that have not synced yet (serverId null), even if there are several', async () => {
    const records = mockCollection([
      makeRecord({ serverId: null }),
      makeRecord({ serverId: null }),
    ]);

    const removed = await dedupeByServerId('specimens');

    expect(removed).toBe(0);
    records.forEach((r) => expect(r.destroyPermanently).not.toHaveBeenCalled());
  });

  it('keeps the more recently synced copy and destroys the stale duplicate', async () => {
    const stale = makeRecord({ serverId: 'srv-1', syncedAt: '2026-01-01T00:00:00Z' });
    const fresh = makeRecord({ serverId: 'srv-1', syncedAt: '2026-01-02T00:00:00Z' });
    mockCollection([stale, fresh]);

    const removed = await dedupeByServerId('specimens');

    expect(removed).toBe(1);
    expect(stale.destroyPermanently).toHaveBeenCalledTimes(1);
    expect(fresh.destroyPermanently).not.toHaveBeenCalled();
  });

  it('keeps the fresher copy regardless of which order the duplicates were fetched in', async () => {
    const fresh = makeRecord({ serverId: 'srv-1', syncedAt: '2026-01-02T00:00:00Z' });
    const stale = makeRecord({ serverId: 'srv-1', syncedAt: '2026-01-01T00:00:00Z' });
    // fresh comes first this time
    mockCollection([fresh, stale]);

    await dedupeByServerId('specimens');

    expect(stale.destroyPermanently).toHaveBeenCalledTimes(1);
    expect(fresh.destroyPermanently).not.toHaveBeenCalled();
  });

  it('collapses a 3-way duplicate down to a single survivor', async () => {
    const a = makeRecord({ serverId: 'srv-1', syncedAt: '2026-01-01T00:00:00Z' });
    const b = makeRecord({ serverId: 'srv-1', syncedAt: '2026-01-03T00:00:00Z' }); // freshest
    const c = makeRecord({ serverId: 'srv-1', syncedAt: '2026-01-02T00:00:00Z' });
    mockCollection([a, b, c]);

    const removed = await dedupeByServerId('specimens');

    expect(removed).toBe(2);
    expect(a.destroyPermanently).toHaveBeenCalledTimes(1);
    expect(c.destroyPermanently).toHaveBeenCalledTimes(1);
    expect(b.destroyPermanently).not.toHaveBeenCalled();
  });

  it('does not crash when syncedAt is missing on a duplicate — settles on exactly one survivor', async () => {
    const a = makeRecord({ serverId: 'srv-1', syncedAt: null });
    const b = makeRecord({ serverId: 'srv-1', syncedAt: null });
    mockCollection([a, b]);

    const removed = await dedupeByServerId('specimens');

    expect(removed).toBe(1);
    const destroyedCount = [a, b].filter((r) => r.destroyPermanently.mock.calls.length > 0).length;
    expect(destroyedCount).toBe(1);
  });

  it('only compares records within the same table call — different tables are independent', async () => {
    const specimenDup = makeRecord({ serverId: 'srv-1', syncedAt: '2026-01-01T00:00:00Z' });
    mockCollection([specimenDup]);

    await dedupeByServerId('specimens');

    expect(specimenDup.destroyPermanently).not.toHaveBeenCalled();
  });

  // Regression guard: a duplicate can hold local edits the server doesn't
  // have yet (e.g. an offline rejection recorded on one copy while a normal
  // pull created the other). Picking the survivor by syncedAt alone could
  // destroy the copy with real, unpushed user data.
  describe('protects copies with unsynced local edits', () => {
    it('keeps the dirty copy even though the synced copy has a newer syncedAt', async () => {
      const dirty = makeRecord({
        serverId: 'srv-1',
        syncedAt: '2026-01-01T00:00:00Z',
        syncStatus: 'updated',
      });
      const synced = makeRecord({
        serverId: 'srv-1',
        syncedAt: '2026-01-05T00:00:00Z',
        syncStatus: 'synced',
      });
      mockCollection([dirty, synced]);

      const removed = await dedupeByServerId('specimens');

      expect(removed).toBe(1);
      expect(dirty.destroyPermanently).not.toHaveBeenCalled();
      expect(synced.destroyPermanently).toHaveBeenCalledTimes(1);
    });

    it('touches neither copy when two duplicates both carry unsynced edits', async () => {
      const dirtyA = makeRecord({ serverId: 'srv-1', syncStatus: 'created' });
      const dirtyB = makeRecord({ serverId: 'srv-1', syncStatus: 'updated' });
      mockCollection([dirtyA, dirtyB]);

      const removed = await dedupeByServerId('specimens');

      expect(removed).toBe(0);
      expect(dirtyA.destroyPermanently).not.toHaveBeenCalled();
      expect(dirtyB.destroyPermanently).not.toHaveBeenCalled();
    });

    it('still removes an already-synced 3rd copy when two others are dirty', async () => {
      const dirtyA = makeRecord({ serverId: 'srv-1', syncStatus: 'created' });
      const dirtyB = makeRecord({ serverId: 'srv-1', syncStatus: 'updated' });
      const synced = makeRecord({ serverId: 'srv-1', syncStatus: 'synced' });
      mockCollection([dirtyA, dirtyB, synced]);

      const removed = await dedupeByServerId('specimens');

      expect(removed).toBe(1);
      expect(dirtyA.destroyPermanently).not.toHaveBeenCalled();
      expect(dirtyB.destroyPermanently).not.toHaveBeenCalled();
      expect(synced.destroyPermanently).toHaveBeenCalledTimes(1);
    });
  });
});
