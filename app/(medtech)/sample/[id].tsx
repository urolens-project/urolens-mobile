import { useLocalSearchParams } from 'expo-router';

import { SampleDetailScreen } from '@features/sample/components/SampleDetailScreen';

/**
 * @description Route entry for /sample/:id. Keyed on the specimen id so switching
 * samples while this tab stays mounted always remounts fresh state.
 */
export default function SampleDetailRoute(): React.JSX.Element {
  const { id, resultId } = useLocalSearchParams<{ id: string; resultId?: string }>();

  // The (medtech) tabs keep this screen mounted while another tab is showing, so
  // opening a different sample re-uses this same instance. Keying it on the specimen
  // remounts it instead — nothing from the previous sample (its patient, its result,
  // a "not found" state) can carry over into the next one.
  return <SampleDetailScreen key={id} specimenId={id} resultId={resultId} />;
}
