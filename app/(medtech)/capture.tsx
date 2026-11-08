import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { FieldCaptureSessionScreen } from '@features/field-capture/components/FieldCaptureSessionScreen';

/**
 * @description Route entry for /capture. Reads specimen params here, where
 * useLocalSearchParams is reliable, and forwards them on. Expects `specimenId`
 * (required) and `localSpecimenId` (WatermelonDB local id, used for return
 * navigation). The legacy single-image retake path (ImageCaptureScreen,
 * existingImageId) is gone — retaking a legacy result now happens on the
 * website (mobile PR #55 review, #3).
 */
export default function CaptureRoute(): React.JSX.Element {
  const { specimenId, localSpecimenId } = useLocalSearchParams<{
    specimenId: string;
    localSpecimenId: string;
  }>();

  const [mountKey, setMountKey] = useState(0);

  // Remount on every focus so a previous session's uploading/previewing state
  // never leaks into a fresh capture session.
  useFocusEffect(
    useCallback(() => {
      setMountKey((k) => k + 1);
    }, []),
  );

  return (
    <FieldCaptureSessionScreen
      key={mountKey}
      specimenId={specimenId}
      localSpecimenId={localSpecimenId}
    />
  );
}
