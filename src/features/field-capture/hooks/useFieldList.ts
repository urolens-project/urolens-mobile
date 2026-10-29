import { useEffect, useState } from 'react';

import { Q } from '@nozbe/watermelondb';
import { database } from '@db/database';
import { observeQuery } from '@db/observeQuery';
import type { Unsubscribable } from '@db/observeQuery';
import type ResultField from '@db/models/ResultField';

import { mapFieldListItem } from '../mappers/fieldList.mapper';
import type { FieldListItem } from '../types';

export interface UseFieldListResult {
  fields: FieldListItem[];
  acceptedCount: number;
  undecidedCount: number;
  /** Server id of the specimen's result, once at least one field has synced; null
   * until then (there is nothing to submit yet). */
  resultServerId: string | null;
  isLoading: boolean;
}

const FIELD_LIST_COLUMNS = [
  'server_id',
  'field_no',
  'magnification',
  'status',
  'ai_findings_json',
  'local_image_uri',
];

/**
 * @description Live list of a specimen's captured fields, for the field list screen
 * and the Submit for Verification gate. Reads result_fields directly by specimen_id —
 * every field carries it, so no separate lookup of the result row is needed.
 * @param specimenId - Server specimen id.
 */
export function useFieldList(specimenId: string): UseFieldListResult {
  const [records, setRecords] = useState<ResultField[] | null>(null);

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

  const rows = records ?? [];
  const accepted = rows.filter((f) => f.status === 'ACCEPTED');
  const undecided = rows.filter((f) => f.status === 'ANALYZED' || f.status === 'PENDING_UPLOAD');

  return {
    fields: rows.map(mapFieldListItem),
    acceptedCount: accepted.length,
    undecidedCount: undecided.length,
    resultServerId: rows.find((f) => f.resultId)?.resultId ?? null,
    isLoading: records === null,
  };
}
