import { useLocalSearchParams } from 'expo-router';

import { FieldListScreen } from '@features/field-capture/components/FieldListScreen';

const DEFAULT_MIN_FIELDS = 10;

/**
 * @description Route entry for /field-list. Expects `specimenId` (server id,
 * required), `localSpecimenId` (used for Capture More Fields' return navigation)
 * and `minFields` (carried from the capture session; falls back to the backend's
 * documented default if opened some other way).
 */
export default function FieldListRoute(): React.JSX.Element {
  const { specimenId, localSpecimenId, minFields } = useLocalSearchParams<{
    specimenId: string;
    localSpecimenId: string;
    minFields?: string;
  }>();

  return (
    <FieldListScreen
      specimenId={specimenId}
      localSpecimenId={localSpecimenId}
      minFields={minFields ? Number(minFields) : DEFAULT_MIN_FIELDS}
    />
  );
}
