// Path: urolens-mobile/src/features/result-confirmation/hooks/useResultConfirmation.ts
import { useState, useEffect, useRef } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@db/database';
import AnalysisResult from '@db/models/AnalysisResult';
import PendingSync from '@db/models/PendingSync';
import { apiClient } from '@lib/apiClient';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { PendingSyncAction, PendingSyncStatus } from '@/types/enums';
import type { AIFindingEntry, ConfirmResultResponse } from '../types';

interface UseResultConfirmationReturn {
  result: AnalysisResult | null;
  aiFindings: AIFindingEntry[];
  isLoading: boolean;
  isConfirming: boolean;
  error: string | null;
  confirmResult: () => Promise<void>;
}

// Derives structured AIFindingEntry list from raw findings map.
// Anomalous = any particle count above threshold (>5 per field).
function deriveFindings(raw: Record<string, number>): AIFindingEntry[] {
  return Object.entries(raw).map(([parameter, count]) => ({
    parameter,
    count,
    isAnomalous: count > 5,
  }));
}

export function useResultConfirmation(resultId: string): UseResultConfirmationReturn {
  const { isOnline } = useNetworkStatus();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref guard prevents double-submission regardless of React re-render timing.
  const confirmingRef = useRef(false);

  // Observe local WatermelonDB record — components never call API directly (SRP)
  useEffect(() => {
    const subscription = database
      .get<AnalysisResult>('analysis_results')
      .query(Q.where('server_id', resultId))
      .observe()
      .subscribe((records) => {
        setResult(records[0] ?? null);
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [resultId]);

  const confirmResult = async (): Promise<void> => {
    if (confirmingRef.current) return;
    confirmingRef.current = true;
    setIsConfirming(true);
    setError(null);

    try {
      if (isOnline) {
        // Online path — direct API call
        await apiClient.post<ConfirmResultResponse>(`/results/${resultId}/confirm`);
        // Server response will arrive via next sync pull; optimistic update below
      } else {
        // Offline path — write pending_sync row, update local status optimistically
        await database.write(async () => {
          await database.get<PendingSync>('pending_sync').create((r) => {
            r.entity      = 'analysis_result';
            r.entityId    = resultId;
            r.action      = PendingSyncAction.CONFIRM_RESULT;
            r.payloadJson = JSON.stringify({ resultId });
            r.status      = PendingSyncStatus.PENDING;
            r.createdAt   = Date.now();
          });
        });
      }

      // Optimistic local status update in both online and offline paths
      if (result) {
        await database.write(async () => {
          await result.update((r) => {
            r.status   = 'PENDING_SUPERVISOR_APPROVAL';
            r.isSynced = isOnline;
          });
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to confirm result';
      setError(message);
    } finally {
      confirmingRef.current = false;
      setIsConfirming(false);
    }
  };

  const aiFindings: AIFindingEntry[] = result ? deriveFindings(result.aiFindings) : [];

  return { result, aiFindings, isLoading, isConfirming, error, confirmResult };
}