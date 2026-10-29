import { Q } from '@nozbe/watermelondb';

import { database } from '@db/database';
import { useAsyncAction } from '@hooks/useAsyncAction';
import type AnalysisResult from '@db/models/AnalysisResult';

import { fieldCaptureApi } from '../api/fieldCaptureApi';

export interface UseSubmitFieldsResult {
  /** Submit for Verification: sends the field list on, moving the result to
   * PENDING_CONFIRM. Online only — never queued (SDD Module 2 proposal, section 8). */
  submitFields: (resultServerId: string) => Promise<boolean | undefined>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * @description Submits the accepted field list for web verification and reflects the
 * new status locally right away, so the Queue shows "Verify on website" without
 * waiting for the next sync.
 */
export function useSubmitFields(): UseSubmitFieldsResult {
  const { run, isLoading, error } = useAsyncAction(
    'SubmitFields',
    async (signal: AbortSignal, resultServerId: string): Promise<boolean> => {
      const response = await fieldCaptureApi.submitFields(resultServerId, signal);

      await database.write(async () => {
        const [result] = await database
          .get<AnalysisResult>('analysis_results')
          .query(Q.where('server_id', resultServerId))
          .fetch();
        if (!result) return;
        await result.update((r) => {
          r.status = response.status as AnalysisResult['status'];
          r.isSynced = false;
          r.syncedAt = new Date().toISOString();
        });
      });

      return true;
    },
  );

  return { submitFields: run, isLoading, error };
}
