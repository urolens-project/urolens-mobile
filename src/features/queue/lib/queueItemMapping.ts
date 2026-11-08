import Specimen from '@db/models/Specimen';

import type { PriorityLevel, QueueItem, SpecimenStatus } from '../types';

/**
 * @description Maps a WatermelonDB Specimen model to the Queue's UI item shape.
 * @param s - Specimen model instance.
 * @param returnedServerIds - Server ids currently flagged returned-for-correction.
 * @param resultStatusByServerId - The specimen's latest result status, by specimen server id.
 * @param fieldCountByServerId - The specimen's latest result's accepted field count, by specimen server id.
 */
export function specimenToQueueItem(
  s: Specimen,
  returnedServerIds: Set<string>,
  resultStatusByServerId: Map<string, string> = new Map(),
  fieldCountByServerId: Map<string, number | null> = new Map(),
): QueueItem {
  return {
    id: s.id,
    serverId: s.serverId,
    sampleUid: s.sampleUid,
    patientUid: s.patientUid,
    testType: s.testType,
    status: s.status as SpecimenStatus,
    priorityLevel: s.priorityLevel as PriorityLevel | null,
    receivedAt: s.receivedAt,
    medtechId: s.medtechId,
    rejectionReason: s.rejectionReason,
    rejectionNote: s.rejectionNote,
    rejectedAt: s.rejectedAt,
    syncedAt: s.syncedAt,
    isReturnedForCorrection: !!s.serverId && returnedServerIds.has(s.serverId),
    resultStatus: s.serverId ? (resultStatusByServerId.get(s.serverId) ?? null) : null,
    fieldCount: s.serverId ? (fieldCountByServerId.get(s.serverId) ?? null) : null,
  };
}

/**
 * @description Display-layer safety net: a past sync bug could leave two local specimen
 * rows for the same server record sitting in storage (see db/sync/dedupeByServerId.ts,
 * which now cleans this up on every sync). This collapses any that are still there RIGHT
 * NOW so the Queue never shows a patient card twice while waiting for the next sync to
 * clean the DB up — keeping the copy synced most recently, same tie-break as the DB cleanup.
 * @param items - Queue items that may contain duplicates for the same server record.
 */
export function dedupeQueueItems(items: QueueItem[]): QueueItem[] {
  const bestByKey = new Map<string, QueueItem>();
  for (const item of items) {
    const key = item.serverId ?? item.id;
    const existing = bestByKey.get(key);
    if (!existing) {
      bestByKey.set(key, item);
      continue;
    }
    const existingSyncedAt = existing.syncedAt ? new Date(existing.syncedAt).getTime() : 0;
    const itemSyncedAt = item.syncedAt ? new Date(item.syncedAt).getTime() : 0;
    if (itemSyncedAt > existingSyncedAt) bestByKey.set(key, item);
  }
  return Array.from(bestByKey.values());
}

/**
 * @description Order-independent id-list equality. `results.map(...)` builds a fresh
 * array on every reactive emission, even when the underlying set of returned-for-correction
 * ids hasn't changed — setting state to that new-but-equal array would re-trigger effects
 * (and their DB re-subscribes) on every single tick.
 * @param a - First id list.
 * @param b - Second id list.
 */
export function sameIds(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, i) => id === sortedB[i]);
}

/**
 * @description Same purpose as sameIds, for the result-status/field-count maps: lets a
 * state setter keep a stable reference when the content hasn't actually changed, so an
 * effect that depends on it (and re-subscribes to WatermelonDB) doesn't resubscribe on
 * every single analysis_results emission.
 * @param a - Previous map.
 * @param b - Next map.
 */
export function sameMap<V>(a: Map<string, V>, b: Map<string, V>): boolean {
  if (a.size !== b.size) return false;
  for (const [key, value] of a) {
    if (!b.has(key) || b.get(key) !== value) return false;
  }
  return true;
}
