import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { ImageCaptureScreen } from '@features/image-retake/components/ImageCaptureScreen';

/**
 * @description Route entry for /capture. Reads specimen params here, where
 * useLocalSearchParams is reliable, and forwards them to ImageCaptureScreen.
 * Expects `specimenId` (required), `localSpecimenId` (WatermelonDB local id, used for
 * return navigation), and `existingImageId` (present on retake only).
 */
export default function CaptureRoute(): React.JSX.Element {
  const { specimenId, localSpecimenId, existingImageId } = useLocalSearchParams<{
    specimenId: string;
    localSpecimenId: string;
    existingImageId?: string;
  }>();

  const [mountKey, setMountKey] = useState(0);

  // Remount ImageCaptureScreen on every focus so a previous session's
  // uploading/previewing state never leaks into a fresh retake.
  useFocusEffect(
    useCallback(() => {
      setMountKey((k) => k + 1);
    }, []),
  );

  return (
    <ImageCaptureScreen
      key={mountKey}
      specimenId={specimenId}
      localSpecimenId={localSpecimenId}
      existingImageId={existingImageId}
    />
  );
}
