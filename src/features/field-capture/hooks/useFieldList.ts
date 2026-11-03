import { useEffect, useState } from 'react';

import { Q } from '@nozbe/watermelondb';
import { database } from '@db/database';
import { observeQuery } from '@db/observeQuery';
import type { Unsubscribable } from '@db/observeQuery';
import { PendingSyncAction, PendingSyncStatus } from '@app-types/enums';
import type ResultField from '@db/models/ResultField';
import type PendingSync from '@db/models/PendingSync';

import { mapFieldListItem } from '../mappers/fieldList.mapper';
import type { FieldListItem } from '../types';

export interface FieldCounts {
  acceptedCount: number;
  undecidedCount: number;
  /** Still-queued Accept/Discard/upload decisions for this specimen's fields — see
   * submitBlockingReason.ts: Submit must wait for these to drain, not race them. */
  pendingDecisionsCount: number;
  /** Server id of the specimen's result, once at least one field has synced; null
   * until then (there is nothing to submit yet). */
  resultServerId: string | null;
}

export interface UseFieldListResult extends FieldCounts {
  fields: FieldListItem[];
  isLoading: boolean;
}

const FIELD_LIST_COLUMNS = [
  'server_id',
  'field_no',
  'magnification',
  'status',
  'ai_findings_json',
  'local_image_uri',
  'discard_reason',
];

const QUEUED_FIELD_ACTIONS = [
  PendingSyncAction.ACCEPT_FIELD,
  PendingSyncAction.DISCARD_FIELD,
  PendingSyncAction.UPLOAD_IMAGE,
];
const PENDING_SYNC_COLUMNS = ['status', 'action', 'entity_id'];

/**
 * @description Live list of a specimen's captured fields, for the field list screen
 * and the Submit for Verification gate. Reads result_fields directly by specimen_id —
 * every field carries it, so no separate lookup of the result row is needed.
 * @param specimenId - Server specimen id.
 */
export function useFieldList(specimenId: string): UseFieldListResult {
  const [records, setRecords] = useState<ResultField[] | null>(null);
  const [pendingSyncRows, setPendingSyncRows] = useState<PendingSync[]>([]);

  useEffect((): (() => void) => {
    setRecords(null);
    const subscription: Unsubscribable = observeQuery(
      database
        .get<ResultField>('result_fields')
        .query(Q.where('specimen_id', specimenId), Q.sortBy('field_no', Q.asc)),
      setRecords,
      { columns: FIELD_LIST_COLUMNS, onError: (err) => console.error('[FieldList]', err) },
    );
    return (): void => subscription.unsubscribe();
  }, [specimenId]);

  useEffect((): (() => void) => {
    const subscription: Unsubscribable = observeQuery(
      database
        .get<PendingSync>('pending_sync')
        .query(
          Q.where('status', PendingSyncStatus.PENDING),
          Q.where('action', Q.oneOf(QUEUED_FIELD_ACTIONS)),
        ),
      setPendingSyncRows,
      { columns: PENDING_SYNC_COLUMNS, onError: (err) => console.error('[FieldList]', err) },
    );
    return (): void => subscription.unsubscribe();
  }, []);

  const rows = records ?? [];

  return {
    fields: rows.map(mapFieldListItem),
    ...computeFieldCounts(rows, pendingSyncRows),
    isLoading: records === null,
  };
}

/**
 * @description Derives accepted/undecided/pending-decision counts from already-loaded
 * rows, shared by the live hook above and fetchFieldCounts below so the two never drift.
 * @param rows - Specimen's result_fields rows.
 * @param pendingSyncRows - Queued field actions (ACCEPT_FIELD/DISCARD_FIELD/UPLOAD_IMAGE), unfiltered by specimen.
 */
export function computeFieldCounts(
  rows: ResultField[],
  pendingSyncRows: PendingSync[],
): FieldCounts {
  const accepted = rows.filter((f) => f.status === 'ACCEPTED');
  const undecided = rows.filter((f) => f.status === 'ANALYZED' || f.status === 'PENDING_UPLOAD');

  // UPLOAD_IMAGE is queued on the field's local id (no server id exists yet);
  // ACCEPT_FIELD/DISCARD_FIELD are queued on the field's server id (see
  // useFieldActions.ts / saveUploadedField.ts) — a queued row can match either.
  const fieldIds = new Set<string>();
  for (const f of rows) {
    fieldIds.add(f.id);
    if (f.serverId) fieldIds.add(f.serverId);
  }
  const pendingDecisionsCount = pendingSyncRows.filter((p) => fieldIds.has(p.entityId)).length;

  return {
    acceptedCount: accepted.length,
    undecidedCount: undecided.length,
    pendingDecisionsCount,
    resultServerId: rows.find((f) => f.resultId)?.resultId ?? null,
  };
}

/**
 * @description One-off (non-live) read of the same counts useFieldList observes. Used
 * right before Submit to recheck the guard straight from WatermelonDB, since a React
 * state update from a sync that just ran may not have landed in this render yet.
 * @param specimenId - Server specimen id.
 */
export async function fetchFieldCounts(specimenId: string): Promise<FieldCounts> {
  const rows = await database
    .get<ResultField>('result_fields')
    .query(Q.where('specimen_id', specimenId))
    .fetch();
  const pendingSyncRows = await database
    .get<PendingSync>('pending_sync')
    .query(
      Q.where('status', PendingSyncStatus.PENDING),
      Q.where('action', Q.oneOf(QUEUED_FIELD_ACTIONS)),
    )
    .fetch();
  return computeFieldCounts(rows, pendingSyncRows);
}
