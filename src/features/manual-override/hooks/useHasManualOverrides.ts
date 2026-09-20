import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { useDatabase } from '@nozbe/watermelondb/hooks';
import ManualOverride from '@db/models/ManualOverride';

// Whether the MedTech has corrected any parameter of this result. Watches the local
// records, so it stays right as overrides are added — no need to re-read at tap time.
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
