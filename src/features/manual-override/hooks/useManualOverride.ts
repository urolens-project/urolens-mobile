// Path: urolens-mobile/src/features/manual-override/hooks/useManualOverride.ts
import { useState } from 'react';
import { database } from '@db/database';
import ManualOverride from '@db/models/ManualOverride';
import PendingSync from '@db/models/PendingSync';
import { apiClient } from '@lib/apiClient';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { PendingSyncAction, PendingSyncStatus } from '@/types/enums';
import { useAuthStore } from '@lib/auth/authStore';
import type { OverridePayload, OverrideResponse } from '../types';

interface UseManualOverrideReturn {
  isSubmitting: boolean;
  error: string | null;
  submitOverride: (resultId: string, payload: OverridePayload) => Promise<boolean>;
}

export function useManualOverride(): UseManualOverrideReturn {
  const { isOnline } = useNetworkStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitOverride = async (
    resultId: string,
    payload: OverridePayload,
  ): Promise<boolean> => {
    if (isSubmitting) return false;
    setIsSubmitting(true);
    setError(null);

    try {
      if (isOnline) {
        // Online path — direct API call
        await apiClient.post<OverrideResponse>(`/results/${resultId}/override`, {
          parameter_name:    payload.parameter,
          original_ai_value: String(payload.originalAiValue),
          corrected_value:   String(payload.correctedValue),
          rationale:         payload.rationale,
        });
        // Server will persist original_ai_value — local record marks synced
        await _writeLocalOverride(resultId, payload, true);
      } else {
        // Offline path — pending_sync + local record with is_synced=false.
        // Two separate writes: _writeLocalOverride owns its own transaction, so
        // we must not nest it inside another database.write() call.
        await _writeLocalOverride(resultId, payload, false);
        await database.write(async () => {
          await database.get<PendingSync>('pending_sync').create((r) => {
            r.entity      = 'manual_override';
            r.entityId    = resultId;
            r.action      = PendingSyncAction.OVERRIDE_PARAMETER;
            r.payloadJson = JSON.stringify({ resultId, ...payload });
            r.status      = PendingSyncStatus.PENDING;
            r.createdAt   = Date.now();
          });
        });
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit override';
      setError(message);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, error, submitOverride };
}

// Writes a local ManualOverride record. Used in both online and offline paths.
async function _writeLocalOverride(
  resultId: string,
  payload: OverridePayload,
  isSynced: boolean,
): Promise<void> {
  const userId = useAuthStore.getState().userId ?? '';

  await database.write(async () => {
    await database.get<ManualOverride>('manual_overrides').create((r) => {
      r.resultId        = resultId;
      r.parameter       = payload.parameter;
      r.originalAiValue = payload.originalAiValue;
      r.correctedValue  = payload.correctedValue;
      r.rationale       = payload.rationale;
      r.overriddenBy    = userId;
      r.isSynced        = isSynced;
      r.createdAt       = Date.now();
    });
  });
}