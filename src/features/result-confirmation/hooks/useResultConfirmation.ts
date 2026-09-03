// Path: urolens-mobile/src/features/result-confirmation/hooks/useResultConfirmation.ts
import { useState, useEffect } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '@db/database';
import AnalysisResult from '@db/models/AnalysisResult';
import { useConfirmAction } from './useConfirmAction';
import type { AIFindingEntry } from '../types';

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
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { confirmResult: confirmAction, isConfirming, error } = useConfirmAction();

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
    if (!result) return;
    await confirmAction(result);
  };

  const aiFindings: AIFindingEntry[] = result ? deriveFindings(result.aiFindings) : [];

  return { result, aiFindings, isLoading, isConfirming, error, confirmResult };
}
