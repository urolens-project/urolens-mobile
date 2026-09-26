import { useCallback, useState } from 'react';

import { database } from '@db/database';
import Specimen from '@db/models/Specimen';
import PendingSync from '@db/models/PendingSync';
import apiClient from '@lib/apiClient';
import { getErrorMessage } from '@lib/errorMessage';
import { PendingSyncAction, PendingSyncStatus, RejectionReason } from '@app-types/enums';
import { useNetworkStatus } from '@hooks/useNetworkStatus';

// What a reject attempt came to. The failure message is returned rather than only
// stored in `error`: a caller that awaits reject() and then reads `error` gets the
// value from the render that created its handler — never this attempt's.
export type RejectResult = { status: 'rejected' } | { status: 'failed'; message: string };

export interface UseRejectSpecimenResult {
  reject: (reason: RejectionReason, note?: string) => Promise<RejectResult>;
  isLoading: boolean;
  error: string | null;
}

/**
 * @description Rejects a specimen: posts to the server when online, or queues the
 * rejection for the next sync when offline, and marks the specimen REJECTED locally
 * either way so the Queue reflects it immediately.
 * @param specimenId - Local WatermelonDB id of the specimen to reject.
 */
export function useRejectSpecimen(specimenId: string): UseRejectSpecimenResult {
  const { isOnline } = useNetworkStatus();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reject = useCallback(
    async (reason: RejectionReason, note?: string): Promise<RejectResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const specimen = await database.get<Specimen>('specimens').find(specimenId);

        if (!specimen.serverId) {
          throw new Error('Specimen has not been synced to the server yet.');
        }

        const payload: Record<string, string> = { reasonCode: reason };
        if (note?.trim()) payload.freeTextNote = note.trim();

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
            s.rejectionReason = reason;
            s.rejectionNote = note?.trim() || null;
            s.rejectedAt =
              new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).replace(' ', 'T') +
              '+08:00';
          });
        });
        return { status: 'rejected' };
      } catch (err) {
        const message = getErrorMessage(err, 'Failed to reject specimen');
        setError(message);
        return { status: 'failed', message };
      } finally {
        setIsLoading(false);
      }
    },
    [specimenId, isOnline],
  );

  return { reject, isLoading, error };
}
