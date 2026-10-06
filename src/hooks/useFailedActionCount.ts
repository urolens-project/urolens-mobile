import { useEffect, useState } from 'react';

import { observeQuery } from '@db/observeQuery';
import { failedActionsQuery } from '@db/sync/failedActions';

/**
 * @description How many queued changes the server refused and the MedTech hasn't
 * dismissed. Stays current as syncs fail items or the list is dismissed, so any screen
 * can warn that the phone tried to send something that didn't go through.
 */
export function useFailedActionCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const subscription = observeQuery(failedActionsQuery(), (rows) => setCount(rows.length));
    return () => subscription.unsubscribe();
  }, []);

  return count;
}
