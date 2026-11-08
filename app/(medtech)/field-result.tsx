import { useLocalSearchParams } from 'expo-router';

import { FieldDetailScreen } from '@features/field-capture/components/FieldDetailScreen';
import { useMinFieldsStore } from '@lib/stores/minFieldsStore';

/**
 * @description Route entry for /field-result — re-opens one existing field for a
 * Proceed/Discard decision (the offline-upload backlog, or looking at one again).
 * Expects `localFieldId` (required), `specimenId` (server id, for the live counter)
 * and `minFields` (carried from the field list; falls back to the server's last
 * synced minimum, itself falling back to the documented default, if opened some
 * other way).
 */
export default function FieldResultRoute(): React.JSX.Element {
  const { localFieldId, specimenId, minFields } = useLocalSearchParams<{
    localFieldId: string;
    specimenId: string;
    minFields?: string;
  }>();
  const storedMinFields = useMinFieldsStore((s) => s.minFields);

  return (
    <FieldDetailScreen
      localFieldId={localFieldId}
      specimenId={specimenId}
      minFields={minFields ? Number(minFields) : storedMinFields}
    />
  );
}
