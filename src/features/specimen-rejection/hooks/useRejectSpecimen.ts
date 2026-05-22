import { useState, useCallback } from 'react';
import { database } from '@db/database';
import Specimen from '@db/models/Specimen';
import PendingSync from '@db/models/PendingSync';
import apiClient from '@lib/apiClient';
import { RejectionReason, PendingSyncAction, PendingSyncStatus } from '@app-types/enums';
import { useNetworkStatus } from '@hooks/useNetworkStatus';

export function useRejectSpecimen(specimenId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const { isOnline } = useNetworkStatus();

  const reject = useCallback(
    async (reason: RejectionReason, note?: string) => {
      setIsLoading(true);
      try {
        const specimen = await database.get<Specimen>('specimens').find(specimenId);

        if (!specimen.serverId) {
          throw new Error('Specimen has not been synced to the server yet.');
        }

        const payload: Record<string, string> = { reason_code: reason };
        if (note?.trim()) payload.free_text_note = note.trim();

        if (isOnline) {
          await apiClient.post(`/specimens/${specimen.serverId}/reject`, payload);
        }

        await database.write(async () => {
          if (!isOnline) {
            await database.get<PendingSync>('pending_sync').create((r) => {
              r.entity = 'specimens';
              r.entityId = specimen.serverId!;
              r.action = PendingSyncAction.REJECT_SPECIMEN;
              r.payloadJson = JSON.stringify(payload);
              r.status = PendingSyncStatus.PENDING;
              r.createdAt = Date.now();
            });
          }
          await specimen.update((s) => {
            s.status = 'REJECTED';
          });
        });
      } finally {
        setIsLoading(false);
      }
    },
    [specimenId, isOnline],
  );

  return { reject, isLoading };
}
