import { Q } from '@nozbe/watermelondb';

import { database } from '@db/database';
import { useAsyncAction } from '@hooks/useAsyncAction';
import type AnalysisResult from '@db/models/AnalysisResult';
import type ResultField from '@db/models/ResultField';

import { fieldCaptureApi } from '../api/fieldCaptureApi';
import type { FieldActionResponseDto } from '../types';

export interface FieldActionOutcome {
  acceptedFieldCount: number;
  verifiedFieldCount: number;
  undecidedFieldCount: number;
}

export interface UseFieldActionsResult {
  /** Proceed: moves a field from ANALYZED to ACCEPTED. */
  acceptField: (localFieldId: string) => Promise<FieldActionOutcome | undefined>;
  /** Discard: drops a field, optionally with a reason. */
  discardField: (localFieldId: string, reason?: string) => Promise<FieldActionOutcome | undefined>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * @description Accept or discard a captured field and reconcile the local
 * result_fields / analysis_results rows with the server's authoritative counts.
 */
export function useFieldActions(): UseFieldActionsResult {
  const acceptAction = useAsyncAction(
    'FieldAccept',
    async (signal: AbortSignal, localFieldId: string): Promise<FieldActionOutcome> => {
      const field = await database.get<ResultField>('result_fields').find(localFieldId);
      if (!field.serverId) throw new Error('Field has no server id yet.');
      const response = await fieldCaptureApi.accept(field.serverId, signal);
      await applyFieldAction(field, response);
      return pickCounts(response);
    },
  );

  const discardAction = useAsyncAction(
    'FieldDiscard',
    async (
      signal: AbortSignal,
      localFieldId: string,
      reason?: string,
    ): Promise<FieldActionOutcome> => {
      const field = await database.get<ResultField>('result_fields').find(localFieldId);
      if (!field.serverId) throw new Error('Field has no server id yet.');
      const response = await fieldCaptureApi.discard(field.serverId, reason, signal);
      await applyFieldAction(field, response);
      return pickCounts(response);
    },
  );

  return {
    acceptField: acceptAction.run,
    discardField: discardAction.run,
    isLoading: acceptAction.isLoading || discardAction.isLoading,
    error: acceptAction.error ?? discardAction.error,
  };
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Writes the server's response back onto the local field row, and keeps the
 * parent result's accepted-field count and image pointer up to date — the
 * same two things the backend updates on accept/discard (field_count, the
 * first-accepted field's image).
 */
async function applyFieldAction(
  field: ResultField,
  response: FieldActionResponseDto,
): Promise<void> {
  const { field: summary, acceptedFieldCount } = response;

  await database.write(async () => {
    await field.update((f) => {
      f.status = summary.status;
      f.effectiveCountsJson = JSON.stringify(summary.effectiveCounts ?? {});
      f.version = summary.version;
      f.isSynced = true;
      f.syncedAt = new Date().toISOString();
    });

    const results = database.get<AnalysisResult>('analysis_results');
    const [parent] = await results.query(Q.where('server_id', field.resultId)).fetch();
    if (!parent) return;

    await parent.update((r) => {
      r.fieldCount = acceptedFieldCount;
      if (!r.imageId && summary.status === 'ACCEPTED') {
        r.imageId = field.imageId;
      }
    });
  });
}

function pickCounts(response: FieldActionResponseDto): FieldActionOutcome {
  return {
    acceptedFieldCount: response.acceptedFieldCount,
    verifiedFieldCount: response.verifiedFieldCount,
    undecidedFieldCount: response.undecidedFieldCount,
  };
}
