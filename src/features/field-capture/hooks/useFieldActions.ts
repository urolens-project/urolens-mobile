import { Q } from '@nozbe/watermelondb';
import type { Model } from '@nozbe/watermelondb';

import { database } from '@db/database';
import { PendingSyncAction, PendingSyncStatus } from '@app-types/enums';
import { useAsyncAction } from '@hooks/useAsyncAction';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import type AnalysisResult from '@db/models/AnalysisResult';
import type PendingSync from '@db/models/PendingSync';
import type ResultField from '@db/models/ResultField';

import { fieldCaptureApi } from '../api/fieldCaptureApi';
import type { FieldActionResponseDto } from '../types';

export interface FieldActionOutcome {
  acceptedFieldCount: number;
  /** Not tracked locally — verification is a web-only concept. 0 when offline. */
  verifiedFieldCount: number;
  /** Not tracked locally. 0 when offline. */
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
 * @description Accept or discard a captured field. Online, reconciles the local
 * result_fields / analysis_results rows with the server's authoritative counts;
 * offline, applies the same change optimistically and queues it (SDD Module 2
 * proposal, section 8) — accept/discard only ever run on an already-uploaded field,
 * so there is always a server id to queue against.
 */
export function useFieldActions(): UseFieldActionsResult {
  const { isOnline } = useNetworkStatus();

  const acceptAction = useAsyncAction(
    'FieldAccept',
    async (signal: AbortSignal, localFieldId: string): Promise<FieldActionOutcome> => {
      const field = await database.get<ResultField>('result_fields').find(localFieldId);
      if (!field.serverId) throw new Error('Field has no server id yet.');

      if (!isOnline) {
        return applyOptimistic(field, 'ACCEPTED', PendingSyncAction.ACCEPT_FIELD, null);
      }

      const response = await fieldCaptureApi.accept(field.serverId, signal);
      await applyServerResponse(field, response);
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

      if (!isOnline) {
        return applyOptimistic(field, 'DISCARDED', PendingSyncAction.DISCARD_FIELD, reason ?? null);
      }

      const response = await fieldCaptureApi.discard(field.serverId, reason, signal);
      await applyServerResponse(field, response);
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
async function applyServerResponse(
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

/**
 * Offline counterpart of applyServerResponse: applies the same status change
 * locally (and, for Accept, the same field_count bump and image-pointer rule)
 * without the server's recomputed effective counts — those only ever change
 * through a web correction, so a field just captured on this device has none
 * to lose by waiting for the next sync. Queues the action on the field's
 * server id in the same batch, so the two can never get out of step.
 */
async function applyOptimistic(
  field: ResultField,
  nextStatus: 'ACCEPTED' | 'DISCARDED',
  action: PendingSyncAction,
  reason: string | null,
): Promise<FieldActionOutcome> {
  const createdAt = Date.now();
  let acceptedFieldCount = 0;

  await database.write(async () => {
    const toBatch: Model[] = [
      field.prepareUpdate((f) => {
        f.status = nextStatus;
        f.isSynced = false;
      }),
    ];

    const results = database.get<AnalysisResult>('analysis_results');
    const [parent] = await results.query(Q.where('server_id', field.resultId)).fetch();
    if (parent) {
      acceptedFieldCount = (parent.fieldCount ?? 0) + (nextStatus === 'ACCEPTED' ? 1 : 0);
      toBatch.push(
        parent.prepareUpdate((r) => {
          if (nextStatus === 'ACCEPTED') {
            r.fieldCount = acceptedFieldCount;
            if (!r.imageId) r.imageId = field.imageId;
          }
        }),
      );
    }

    toBatch.push(
      database.get<PendingSync>('pending_sync').prepareCreate((row) => {
        row.entity = 'result_field';
        row.entityId = field.serverId as string;
        row.action = action;
        row.payloadJson = reason ? JSON.stringify({ reason }) : '{}';
        row.status = PendingSyncStatus.PENDING;
        row.createdAt = createdAt;
      }),
    );

    await database.batch(...toBatch);
  });

  return { acceptedFieldCount, verifiedFieldCount: 0, undecidedFieldCount: 0 };
}

function pickCounts(response: FieldActionResponseDto): FieldActionOutcome {
  return {
    acceptedFieldCount: response.acceptedFieldCount,
    verifiedFieldCount: response.verifiedFieldCount,
    undecidedFieldCount: response.undecidedFieldCount,
  };
}
