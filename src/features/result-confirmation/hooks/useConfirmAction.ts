import { useCallback, useRef, useState } from 'react';

import type AnalysisResult from '@db/models/AnalysisResult';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { useAsyncAction } from '@hooks/useAsyncAction';
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
  confirmResult: (
    result: AnalysisResult,
    beforeConfirm?: (signal: AbortSignal) => Promise<void>,
  ) => Promise<ConfirmActionResult>;
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
  const [error, setError] = useState<string | null>(null);
  // Ref guard prevents double-submission regardless of React re-render timing.
  const confirmingRef = useRef(false);

  const action = useCallback(
    async (
      signal: AbortSignal,
      result: AnalysisResult,
      beforeConfirm?: (signal: AbortSignal) => Promise<void>,
    ): Promise<ConfirmActionResult> => {
      setError(null);
      try {
        await beforeConfirm?.(signal);
        if (signal.aborted) return { status: 'busy' };
        await confirmResultCore({ result, isOnline });
        if (signal.aborted) return { status: 'busy' };
        return { status: 'confirmed' };
      } catch (error: unknown) {
        const message = getErrorMessage(error, 'Failed to confirm result');
        console.error('[ResultConfirmation]', error);
        setError(message);
        return { status: 'failed', message };
      }
    },
    [isOnline],
  );
  const { run, isLoading: isConfirming } = useAsyncAction('ResultConfirmation', action);

  const confirmResult = useCallback(
    async (
      result: AnalysisResult,
      beforeConfirm?: (signal: AbortSignal) => Promise<void>,
    ): Promise<ConfirmActionResult> => {
      if (confirmingRef.current) return { status: 'busy' };
      confirmingRef.current = true;
      try {
        return (await run(result, beforeConfirm)) ?? { status: 'busy' };
      } finally {
        confirmingRef.current = false;
      }
    },
    [run],
  );

  return { confirmResult, isConfirming, error };
}
