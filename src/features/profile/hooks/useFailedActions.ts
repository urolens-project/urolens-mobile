import { useCallback, useEffect, useState } from 'react';

import { observeQuery } from '@db/observeQuery';
import { dismissFailedActions, failedActionsQuery, findSampleUid } from '@db/sync/failedActions';
import { useAsyncAction } from '@hooks/useAsyncAction';

import { mapFailedActionToUi } from '../mappers/failedAction.mapper';
import type { FailedActionUi } from '../types';

export interface UseFailedActionsResult {
  items: FailedActionUi[];
  dismissAll: () => Promise<void>;
  isDismissing: boolean;
}

/**
 * @description The queued changes the server refused, ready to list, and a way to clear
 * them once read. A change made offline is shown as done straight away; when the server
 * later refuses it, this is the only place the MedTech finds out.
 */
export function useFailedActions(): UseFailedActionsResult {
  const [items, setItems] = useState<FailedActionUi[]>([]);

  useEffect(() => {
    let isCurrent = true;
    const subscription = observeQuery(failedActionsQuery(), (rows) => {
      Promise.all(rows.map(async (row) => mapFailedActionToUi(row, await findSampleUid(row))))
        .then((mapped) => {
          if (isCurrent) setItems(mapped);
        })
        .catch((err: unknown) => console.error('[Profile] failed to load refused changes', err));
    });
    return () => {
      isCurrent = false;
      subscription.unsubscribe();
    };
  }, []);

  const dismiss = useCallback(async (): Promise<void> => {
    await dismissFailedActions();
  }, []);
  const { run, isLoading: isDismissing } = useAsyncAction('Profile', dismiss);

  const dismissAll = useCallback(async (): Promise<void> => {
    await run();
  }, [run]);

  return { items, dismissAll, isDismissing };
}
