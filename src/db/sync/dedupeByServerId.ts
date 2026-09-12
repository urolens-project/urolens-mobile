import { database } from '../database';

interface DedupableRecord {
  serverId: string | null;
  syncedAt?: string | null;
  // WatermelonDB's own dirty-tracking: 'synced' means no local edits are
  // waiting to be pushed. Anything else ('created' | 'updated' | ...) means
  // this copy holds changes the server doesn't have yet.
  syncStatus: string;
  destroyPermanently: () => Promise<void>;
}

function syncedAtMs(record: DedupableRecord): number {
  return record.syncedAt ? new Date(record.syncedAt).getTime() : 0;
}

/**
 * Collapses local rows that share the same server_id down to one,
 * permanently deleting the rest. Defends against a sync bug where
 * processCreates() could insert a second local row for a specimen the
 * client already had (e.g. a replayed/resent "created" batch) instead of
 * updating the existing one — which surfaced as duplicated patient cards
 * in the Queue, and "Sample not found" once only one of the copies kept
 * receiving updates.
 *
 * Never destroys a copy that still has local, not-yet-synced edits
 * (syncStatus !== 'synced') — e.g. an offline rejection recorded on one
 * duplicate but not the other. If more than one copy in a group has such
 * edits, none of them are touched (only already-synced copies in that
 * group are removed); we can't safely guess which one's edits should win.
 *
 * Must run inside an active database.write() — it mutates records. A
 * no-op once a table is already clean, so it's safe to run on every sync
 * rather than as a one-time migration.
 */
export async function dedupeByServerId(tableName: string): Promise<number> {
  const collection = database.get(tableName);
  const all = (await collection.query().fetch()) as unknown as DedupableRecord[];

  const groups = new Map<string, DedupableRecord[]>();
  for (const record of all) {
    // Not synced yet at all (never round-tripped) — nothing to compare it
    // against by server_id.
    if (!record.serverId) continue;
    const group = groups.get(record.serverId);
    if (group) group.push(record);
    else groups.set(record.serverId, [record]);
  }

  let removedCount = 0;

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const dirty = group.filter((r) => r.syncStatus !== 'synced');
    let removable: DedupableRecord[];

    if (dirty.length === 1) {
      // Exactly one copy has unpushed local edits — it wins outright,
      // regardless of which copy the server last touched most recently.
      const keep = dirty[0];
      removable = group.filter((r) => r !== keep);
    } else if (dirty.length === 0) {
      // All copies are fully synced — keep whichever was synced most
      // recently and remove the rest.
      const keep = group.reduce((a, b) => (syncedAtMs(b) > syncedAtMs(a) ? b : a));
      removable = group.filter((r) => r !== keep);
    } else {
      // Two or more copies carry local edits — can't safely pick a winner.
      // Only remove the already-synced copies in this group so no local
      // edit is ever lost; the remaining duplicates will resolve on a
      // later sync once they're clean.
      removable = group.filter((r) => r.syncStatus === 'synced');
    }

    for (const record of removable) {
      await record.destroyPermanently();
      removedCount += 1;
    }
  }

  return removedCount;
}
