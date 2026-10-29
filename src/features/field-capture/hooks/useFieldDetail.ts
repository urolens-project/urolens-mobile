import { useEffect, useState } from 'react';

import { Q } from '@nozbe/watermelondb';
import { database } from '@db/database';
import type ResultField from '@db/models/ResultField';
import type FieldDetection from '@db/models/FieldDetection';

import type { CapturedField } from '../types';

export interface UseFieldDetailResult {
  field: CapturedField | null;
  isLoading: boolean;
}

/**
 * @description Live-loads one field (plus its cached AI boxes) by local id, for
 * re-opening a field from the field list — either a backlog field that just finished
 * uploading (PENDING_UPLOAD → ANALYZED) or one the MedTech wants to look at again.
 * @param localFieldId - Local WatermelonDB id of the result_fields row.
 * @param acceptedFieldCount - Current accepted count, for the header counter.
 * @param minFields - Minimum accepted fields required, for the header counter.
 */
export function useFieldDetail(
  localFieldId: string,
  acceptedFieldCount: number,
  minFields: number,
): UseFieldDetailResult {
  const [record, setRecord] = useState<ResultField | null>(null);
  const [detectionsJson, setDetectionsJson] = useState<string>('[]');

  useEffect((): (() => void) => {
    setRecord(null);
    const fieldSubscription = database
      .get<ResultField>('result_fields')
      .findAndObserve(localFieldId)
      .subscribe({
        next: setRecord,
        error: (err: unknown) => console.error('[FieldDetail]', err),
      });

    const detectionsSubscription = database
      .get<FieldDetection>('field_detections')
      .query(Q.where('field_id', localFieldId))
      .observe()
      .subscribe({
        next: (records) => setDetectionsJson(records[0]?.detectionsJson ?? '[]'),
        error: (err: unknown) => console.error('[FieldDetail]', err),
      });

    return (): void => {
      fieldSubscription.unsubscribe();
      detectionsSubscription.unsubscribe();
    };
  }, [localFieldId]);

  if (!record) return { field: null, isLoading: true };

  let detections: CapturedField['detections'] = [];
  try {
    detections = JSON.parse(detectionsJson);
  } catch {
    detections = [];
  }

  return {
    field: {
      localId: record.id,
      fieldNo: record.fieldNo,
      magnification: record.magnification,
      aiFindings: record.aiFindings,
      detections,
      imageWidth: record.imageWidth,
      imageHeight: record.imageHeight,
      smartDiagnosisPreview: record.smartDiagnosis,
      smartDiagnosisUnavailable: record.smartDiagnosisUnavailable,
      localImageUri: record.localImageUri ?? '',
      acceptedFieldCount,
      minFields,
    },
    isLoading: false,
  };
}
