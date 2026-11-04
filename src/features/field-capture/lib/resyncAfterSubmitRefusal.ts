import { Q } from '@nozbe/watermelondb';
import { database } from '@db/database';
import { requestFullPull, synchronizeAfterCurrent } from '@db/sync/syncManager';
import type { ActionError } from '@hooks/useAsyncAction';
import type ResultField from '@db/models/ResultField';

// Refusals that mean the phone and server disagree about the fields: sync so the
// field list shows what the server holds.
const FIELD_STATE_ERROR_CODES = new Set(['FIELDS_UNDECIDED', 'FIELDS_BELOW_MINIMUM']);

/**
 * @description The server ids FIELDS_UNDECIDED names in `details.undecidedFields`
 * (backend PR #114); empty when the server sent none (an older backend) or the shape
 * is unexpected.
 */
function undecidedFieldIds(details: Record<string, unknown> | undefined): string[] {
  const listed = details?.undecidedFields;
  if (!Array.isArray(listed)) return [];
  return listed
    .map((entry: unknown): unknown =>
      typeof entry === 'object' && entry !== null ? (entry as { fieldId?: unknown }).fieldId : null,
    )
    .filter((fieldId): fieldId is string => typeof fieldId === 'string');
}

/**
 * @description Whether any field the server still waits on is missing on this phone,
 * or shows here as already decided. Either way only a full pull corrects it.
 */
async function isOutOfStep(serverFieldIds: string[]): Promise<boolean> {
  if (serverFieldIds.length === 0) return false;
  const local = await database
    .get<ResultField>('result_fields')
    .query(Q.where('server_id', Q.oneOf(serverFieldIds)))
    .fetch();
  return local.length < serverFieldIds.length || local.some((f) => f.status !== 'ANALYZED');
}

/**
 * @description After the server refuses Submit for Verification because of the fields,
 * brings the phone back in step: a sync, and first a full pull when FIELDS_UNDECIDED
 * names a field this phone doesn't have (its upload's answer was lost) or shows as
 * decided (a decision the server never got). Best-effort: a failed sync is logged, and
 * the caller still shows the server's message. Other refusals do nothing.
 * @param error - The refused submit's error.
 */
export async function resyncAfterSubmitRefusal(error: ActionError | null): Promise<void> {
  if (!error?.code || !FIELD_STATE_ERROR_CODES.has(error.code)) return;
  try {
    if (
      error.code === 'FIELDS_UNDECIDED' &&
      (await isOutOfStep(undecidedFieldIds(error.details)))
    ) {
      await requestFullPull();
    }
    await synchronizeAfterCurrent();
  } catch (err) {
    console.error('[SubmitFields] resync after refusal failed', err);
  }
}
