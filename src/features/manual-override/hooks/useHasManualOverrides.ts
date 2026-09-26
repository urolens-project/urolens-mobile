import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/hooks';

import type ManualOverride from '@db/models/ManualOverride';

/**
 * @description Tracks whether the medtech has corrected any parameter of this result.
 * Watches the local WatermelonDB records so it stays current as overrides are added,
 * with no need to re-read at tap time.
 * @param resultServerId - Server id of the analysis result, or null/undefined if not yet known.
 */
export function useHasManualOverrides(resultServerId: string | null | undefined): boolean {
  const database = useDatabase();
  const [hasOverrides, setHasOverrides] = useState(false);

  useEffect(() => {
    if (!resultServerId) {
      setHasOverrides(false);
      return;
    }

    const subscription = database
      .get<ManualOverride>('manual_overrides')
      .query(Q.where('result_id', resultServerId))
      .observe()
      .subscribe((records) => setHasOverrides(records.length > 0));

    return () => subscription.unsubscribe();
  }, [database, resultServerId]);

  return hasOverrides;
}
