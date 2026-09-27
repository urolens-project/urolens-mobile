// Path: urolens-mobile/src/features/manual-override/hooks/useManualOverride.ts
import { useCallback } from 'react';

import { database } from '@db/database';
import type ManualOverride from '@db/models/ManualOverride';
import type PendingSync from '@db/models/PendingSync';
import { apiClient } from '@lib/apiClient';
import { useAuthStore } from '@lib/auth/authStore';
import { getErrorMessage } from '@lib/errorMessage';
import { useAsyncAction } from '@hooks/useAsyncAction';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { PendingSyncAction, PendingSyncStatus } from '@/types/enums';

import type { OverridePayload, OverrideResponse } from '../types';

export interface UseManualOverrideResult {
  isSubmitting: boolean;
  error: string | null;
  submitOverride: (resultId: string, payload: OverridePayload) => Promise<boolean>;
}

/**
 * @description Writes a local ManualOverride record. Used by both the online and offline paths.
 * @param resultId - Server id of the analysis result being corrected.
 * @param payload - The parameter, corrected value, and rationale for the override.
 * @param isSynced - Whether the override has already reached the server.
 */
async function writeLocalOverride(
  resultId: string,
  payload: OverridePayload,
  isSynced: boolean,
): Promise<void> {
  const userId = useAuthStore.getState().userId ?? '';

  await database.write(async () => {
    await database.get<ManualOverride>('manual_overrides').create((r) => {
      r.resultId = resultId;
      r.parameter = payload.parameter;
      r.originalAiValue = payload.originalAiValue;
      r.correctedValue = payload.correctedValue;
      r.rationale = payload.rationale;
      r.overriddenBy = userId;
      r.isSynced = isSynced;
      r.createdAt = Date.now();
    });
  });
}

/**
 * @description Submits a manual parameter override, either straight to the API when online
 * or queued via pending_sync when offline. Either path also writes a local record so the
 * result screen reflects the override immediately.
 */
export function useManualOverride(): UseManualOverrideResult {
  const { isOnline } = useNetworkStatus();

  const performSubmit = useCallback(
    async (_signal: AbortSignal, resultId: string, payload: OverridePayload): Promise<void> => {
      try {
        if (isOnline) {
          // Online path — direct API call. Server persists original_ai_value.
          await apiClient.post<OverrideResponse>(`/results/${resultId}/override`, {
            parameter: payload.parameter,
            originalAiValue: payload.originalAiValue,
            correctedValue: payload.correctedValue,
            rationale: payload.rationale,
          });
          await writeLocalOverride(resultId, payload, true);
        } else {
          // Offline path — pending_sync + local record with is_synced=false.
          // Two separate writes: writeLocalOverride owns its own transaction, so
          // it must not be nested inside another database.write() call.
          await writeLocalOverride(resultId, payload, false);
          await database.write(async () => {
            await database.get<PendingSync>('pending_sync').create((r) => {
              r.entity = 'manual_override';
              r.entityId = resultId;
              r.action = PendingSyncAction.OVERRIDE_PARAMETER;
              r.payloadJson = JSON.stringify({ resultId, ...payload });
              r.status = PendingSyncStatus.PENDING;
              r.createdAt = Date.now();
            });
          });
        }
      } catch (err) {
        throw new Error(getErrorMessage(err, 'Failed to submit override'));
      }
    },
    [isOnline],
  );
  const { run, isLoading: isSubmitting, error } = useAsyncAction('ManualOverride', performSubmit);

  const submitOverride = useCallback(
    async (resultId: string, payload: OverridePayload): Promise<boolean> => {
      const result = await run(resultId, payload);
      return result !== undefined;
    },
    [run],
  );

  return { isSubmitting, error: error?.message ?? null, submitOverride };
}
