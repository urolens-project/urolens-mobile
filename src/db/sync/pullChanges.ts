import type { ServerRecord } from '@db/types';
import { mapServerToLocal } from '@db/mappers/sync.mapper';
import { database } from '@db/database';
import { apiClient } from '@lib/apiClient';

import { resolveConflict, applyResolution } from './conflictResolver';
import { dedupeByServerId } from './dedupeByServerId';
import { throwIfSyncCancelled } from './syncCancellation';

interface TableChanges {
  created: ServerRecord[];
  updated: ServerRecord[];
  /** Server ids the phone should remove; only filled on a delta sync. */
  deleted?: string[];
}

interface SyncChanges {
  changes: {
    specimens?: TableChanges;
    queueAssignments?: TableChanges;
    analysisResults?: TableChanges;
    manualOverrides?: TableChanges;
  };
  timestamp: string;
}

/**
 * @description Pulls server changes since the last sync and writes them into the
 * local WatermelonDB, resolving field-level conflicts and deduping afterward.
 * @param lastSyncedAt - ISO timestamp of the last successful sync, or null for a full sync.
 * @param signal - Cancels transport and rejects obsolete responses before applying local writes.
 */
export async function pullChanges(
  lastSyncedAt: string | null,
  signal?: AbortSignal,
): Promise<string> {
  throwIfSyncCancelled(signal);
  const params = lastSyncedAt ? `?lastSyncedAt=${encodeURIComponent(lastSyncedAt)}` : '';
  const response = await apiClient.get<SyncChanges>(`/sync/pull${params}`, { signal });
  throwIfSyncCancelled(signal);
  const { changes, timestamp } = response.data;

  await database.write(async (): Promise<void> => {
    // The writer can be queued behind other work after the response has arrived.
    throwIfSyncCancelled(signal);
    if (changes.specimens) {
      await processCreates('specimens', changes.specimens.created);
      await processUpdates('specimens', changes.specimens.updated);
      await processDeletes('specimens', changes.specimens.deleted);
    }
    if (changes.queueAssignments) {
      await processCreates('queue_assignments', changes.queueAssignments.created);
      await processUpdates('queue_assignments', changes.queueAssignments.updated);
      await processDeletes('queue_assignments', changes.queueAssignments.deleted);
    }
    if (changes.analysisResults) {
      await processCreates('analysis_results', changes.analysisResults.created);
      await processUpdates('analysis_results', changes.analysisResults.updated);
      await processDeletes('analysis_results', changes.analysisResults.deleted);
    }
    if (changes.manualOverrides) {
      await processCreates('manual_overrides', changes.manualOverrides.created);
      await processUpdates('manual_overrides', changes.manualOverrides.updated);
      await processDeletes('manual_overrides', changes.manualOverrides.deleted);
    }

    // Defensive cleanup, every sync: collapses any duplicate local rows a
    // past (or future, unforeseen) sync bug may have left behind. No-op
    // once a table is clean.
    await dedupeByServerId('specimens');
    await dedupeByServerId('queue_assignments');
    await dedupeByServerId('analysis_results');
    await dedupeByServerId('manual_overrides');
  });

  throwIfSyncCancelled(signal);
  return timestamp;
}

async function processCreates(tableName: string, records: ServerRecord[]): Promise<void> {
  if (!records.length) return;
  const collection = database.get(tableName);

  // The server sent these as newly "created", but a replayed/resent sync
  // batch could resend a record the client already has locally. Blindly
  // inserting in that case is what produced duplicate local rows (e.g. two
  // specimen rows for the same server_id) — surfacing as repeated cards in
  // the Queue and, once only one copy kept receiving updates, an occasional
  // "Sample not found" on the stale one. Check first; update in place if a
  // local copy with the same server_id already exists.
  const existing = (await collection.query().fetch()) as unknown as Record<string, unknown>[];
  const existingByServerId = new Map(
    existing.filter((r) => r['serverId']).map((r) => [r['serverId'] as string, r]),
  );

  for (const record of records) {
    const already = existingByServerId.get(record.id);
    if (already) {
      await (
        already as { update: (fn: (r: Record<string, unknown>) => void) => Promise<void> }
      ).update((r) => {
        Object.assign(r, mapServerToLocal(tableName, record));
      });
      continue;
    }

    const created = await collection.create((model) => {
      Object.assign(
        model as unknown as Record<string, unknown>,
        mapServerToLocal(tableName, record),
      );
    });
    existingByServerId.set(record.id, created as unknown as Record<string, unknown>);
  }
}

/**
 * @description Removes local rows the server reports as gone — samples that aged out of
 * the sync window or are no longer assigned to this MedTech. Without this, every table
 * only ever grows, and a reassigned or aged-out sample stays on the phone forever.
 * @param tableName - Local database table.
 * @param deletedIds - Server ids to remove; only present on a delta sync.
 */
async function processDeletes(tableName: string, deletedIds: string[] | undefined): Promise<void> {
  if (!deletedIds?.length) return;
  const collection = database.get(tableName);
  const deletedSet = new Set(deletedIds);
  const existing = (await collection.query().fetch()) as unknown as Record<string, unknown>[];
  for (const record of existing) {
    if (record['serverId'] && deletedSet.has(record['serverId'] as string)) {
      await (record as unknown as { destroyPermanently: () => Promise<void> }).destroyPermanently();
    }
  }
}

async function processUpdates(tableName: string, records: ServerRecord[]): Promise<void> {
  if (!records.length) return;
  const collection = database.get(tableName);
  for (const serverRecord of records) {
    try {
      const allLocalRecords = (await collection.query().fetch()) as unknown as Record<
        string,
        unknown
      >[];
      const localRecord = allLocalRecords.find((r) => r['serverId'] === serverRecord.id);

      // Record not in local DB yet — delta sync sent it as an update but it's new here
      if (!localRecord) {
        await collection.create((model) => {
          Object.assign(
            model as unknown as Record<string, unknown>,
            mapServerToLocal(tableName, serverRecord),
          );
        });
        continue;
      }

      await (
        localRecord as { update: (fn: (r: Record<string, unknown>) => void) => Promise<void> }
      ).update((r) => {
        const mapped = mapServerToLocal(tableName, serverRecord);
        for (const [key, serverVal] of Object.entries(mapped)) {
          // Local bookkeeping, not server data — always overwrite, never a real conflict.
          if (key === 'syncedAt' || key === 'serverId') {
            r[key] = serverVal;
            continue;
          }
          const clientVal = r[key];
          if (serverVal !== clientVal) {
            const strategy = resolveConflict({
              table: tableName,
              column: key,
              serverValue: serverVal,
              clientValue: clientVal,
              localRecord: localRecord as Record<string, unknown>,
            });
            r[key] = applyResolution(strategy, serverVal, clientVal);
          } else {
            r[key] = serverVal;
          }
        }
      });
    } catch (err) {
      console.error(`[pullChanges] Failed to update ${tableName} record ${serverRecord.id}:`, err);
    }
  }
}
