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
  submitOverride: (resultId: string, payload: OverridePayload) => Promise<void>;
}

export function useManualOverride(): UseManualOverrideReturn {
  const { isOnline } = useNetworkStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitOverride = async (
    resultId: string,
    payload: OverridePayload,
  ): Promise<void> => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (isOnline) {
        // Online path — direct API call
        await apiClient.post<OverrideResponse>(`/results/${resultId}/override`, {
          parameter:      payload.parameter,
          corrected_value: payload.correctedValue,
          rationale:      payload.rationale,
        });
        // Server will persist original_ai_value — local record marks synced
        await _writeLocalOverride(resultId, payload, true);
      } else {
        // Offline path — pending_sync + local record with is_synced=false
        // is_synced=false triggers CLIENT_WINS in conflictResolver.ts
        await database.write(async () => {
          await _writeLocalOverride(resultId, payload, false);
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit override';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, error, submitOverride };
}

// Writes a local ManualOverride record. Used in both online and offline paths.
// original_ai_value is read from local WatermelonDB so it is never lost.
async function _writeLocalOverride(
  resultId: string,
  payload: OverridePayload,
  isSynced: boolean,
): Promise<void> {
  const userId = useAuthStore.getState().userId ?? '';

  // Read current AI value from local AnalysisResult before writing override
  const results = await database
    .get('analysis_results')
    .query()
    .fetch() as unknown as { serverId: string; aiFindings: Record<string, number> }[];

  const result = results.find((r) => r.serverId === resultId);
  const originalAiValue = result?.aiFindings?.[payload.parameter] ?? 0;

  await database.write(async () => {
    await database.get<ManualOverride>('manual_overrides').create((r) => {
      r.resultId        = resultId;
      r.parameter       = payload.parameter;
      r.originalAiValue = originalAiValue;
      r.correctedValue  = payload.correctedValue;
      r.rationale       = payload.rationale;
      r.overriddenBy    = userId;
      r.isSynced        = isSynced;
      r.createdAt       = new Date().toISOString();
    });
  });
}