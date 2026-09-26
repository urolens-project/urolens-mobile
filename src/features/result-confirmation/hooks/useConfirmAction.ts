import { useState, useRef } from 'react';

import AnalysisResult from '@db/models/AnalysisResult';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { getErrorMessage } from '@lib/errorMessage';

import { confirmResultCore } from '../lib/confirmResultCore';

// What a confirm attempt came to. The failure message is returned rather than only
// stored in `error`: a caller that awaits confirmResult() and then reads `error`
// gets the value from the render that created its handler — always the previous
// one, never this attempt's.
export type ConfirmActionResult =
  | { status: 'confirmed' }
  // A confirmation is already running (a double-tap). That one reports the outcome,
  // so there is nothing to show for this call.
  | { status: 'busy' }
  | { status: 'failed'; message: string };

interface UseConfirmActionReturn {
  confirmResult: (result: AnalysisResult) => Promise<ConfirmActionResult>;
  isConfirming: boolean;
  error: string | null;
}

/**
 * @description Shared confirm-action state (loading/error/double-submit guard) for any
 * screen that needs to confirm an AnalysisResult. Business logic lives in
 * `confirmResultCore` so both call sites behave identically. A confirm already in
 * flight returns `{ status: 'busy' }` immediately instead of starting a second one.
 */
export function useConfirmAction(): UseConfirmActionReturn {
  const { isOnline } = useNetworkStatus();
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref guard prevents double-submission regardless of React re-render timing.
  const confirmingRef = useRef(false);

  const confirmResult = async (result: AnalysisResult): Promise<ConfirmActionResult> => {
    if (confirmingRef.current) return { status: 'busy' };
    confirmingRef.current = true;
    setIsConfirming(true);
    setError(null);

    try {
      await confirmResultCore({ result, isOnline });
      return { status: 'confirmed' };
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to confirm result');
      setError(message);
      return { status: 'failed', message };
    } finally {
      confirmingRef.current = false;
      setIsConfirming(false);
    }
  };

  return { confirmResult, isConfirming, error };
}
