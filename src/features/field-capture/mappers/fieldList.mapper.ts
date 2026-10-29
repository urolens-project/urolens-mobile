import type ResultField from '@db/models/ResultField';

import type { FieldListItem } from '../types';

/**
 * @description Maps a local result_fields row to the field list's UI model.
 * @param field - Local WatermelonDB record.
 */
export function mapFieldListItem(field: ResultField): FieldListItem {
  const counts = Object.values(field.aiFindings);
  return {
    localId: field.id,
    fieldNo: field.fieldNo,
    magnification: field.magnification,
    status: field.status,
    thumbnailUri: field.localImageUri,
    particleCount: counts.reduce((sum, count) => sum + count, 0),
    discardReason: field.discardReason,
  };
}
