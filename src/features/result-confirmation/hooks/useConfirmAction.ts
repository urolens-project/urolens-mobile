import { useState, useRef } from 'react';
import AnalysisResult from '@db/models/AnalysisResult';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { confirmResultCore } from '../lib/confirmResultCore';

interface UseConfirmActionReturn {
  confirmResult: (result: AnalysisResult) => Promise<boolean>;
  isConfirming: boolean;
  error: string | null;
}

// Shared confirm-action state (loading/error/double-submit guard) for any
// screen that needs to confirm an AnalysisResult. Business logic lives in
// confirmResultCore so both call sites behave identically.
export function useConfirmAction(): UseConfirmActionReturn {
  const { isOnline } = useNetworkStatus();
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref guard prevents double-submission regardless of React re-render timing.
  const confirmingRef = useRef(false);

  const confirmResult = async (result: AnalysisResult): Promise<boolean> => {
    if (confirmingRef.current) return false;
    confirmingRef.current = true;
    setIsConfirming(true);
    setError(null);

    try {
      await confirmResultCore({ result, isOnline });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to confirm result';
      setError(message);
      return false;
    } finally {
      confirmingRef.current = false;
      setIsConfirming(false);
    }
  };

  return { confirmResult, isConfirming, error };
}
