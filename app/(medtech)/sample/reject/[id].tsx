import { useLocalSearchParams } from 'expo-router';

import { RejectSpecimenScreen } from '@features/specimen-rejection/components/RejectSpecimenScreen';

/**
 * @description Route entry for /sample/reject/:id.
 */
export default function RejectSpecimenRoute(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RejectSpecimenScreen specimenId={id ?? ''} />;
}
