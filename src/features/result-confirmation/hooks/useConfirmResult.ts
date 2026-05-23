import { useState, useCallback } from 'react';
import { database } from '@db/database';
import AnalysisResult from '@db/models/AnalysisResult';
import PendingSync from '@db/models/PendingSync';
import apiClient from '@lib/apiClient';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { PendingSyncAction, PendingSyncStatus, ResultStatus } from '@app-types/enums';

export function useConfirmResult() {
  const [isLoading, setIsLoading] = useState(false);
  const { isOnline } = useNetworkStatus();

  const confirm = useCallback(
    async (resultId: string, serverId: string | null, notes?: string) => {
      setIsLoading(true);
      try {
        const result = await database.get<AnalysisResult>('analysis_results').find(resultId);
        const payload = { notes: notes?.trim() || null };

        if (isOnline && serverId) {
          await apiClient.post(`/results/${serverId}/confirm`, payload);
        }

        await database.write(async () => {
          if (!isOnline || !serverId) {
            await database.get<PendingSync>('pending_sync').create((r) => {
              r.entity = 'analysis_results';
              r.entityId = serverId ?? resultId;
              r.action = PendingSyncAction.CONFIRM_RESULT;
              r.payloadJson = JSON.stringify(payload);
              r.status = PendingSyncStatus.PENDING;
              r.createdAt = Date.now();
            });
          }
          await result.update((r) => {
            r.status = ResultStatus.PENDING_SUPERVISOR_APPROVAL;
          });
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isOnline],
  );

  return { confirm, isLoading };
}
