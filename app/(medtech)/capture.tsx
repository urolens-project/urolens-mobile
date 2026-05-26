// app/(medtech)/capture.tsx
/**
 * T2.7 — Image Capture Route
 *
 * Reads route params here (in the actual route file, where useLocalSearchParams
 * is reliable) and forwards them as props to ImageCaptureScreen.
 *
 * Expected query params:
 *   specimenId       — server UUID of the specimen (required)
 *   localSpecimenId  — WatermelonDB local ID, used for return navigation
 *   existingImageId  — server UUID of an existing image (present on retake only)
 *
 * useFocusEffect increments mountKey on every screen focus so ImageCaptureScreen
 * always remounts fresh — this prevents stale uploading/previewing state from
 * a previous session being shown when the user navigates back for a retake.
 */

import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ImageCaptureScreen } from '@features/image-retake/components/ImageCaptureScreen';

export default function CaptureRoute() {
  const { specimenId, localSpecimenId, existingImageId } = useLocalSearchParams<{
    specimenId: string;
    localSpecimenId: string;
    existingImageId?: string;
  }>();

  const [mountKey, setMountKey] = useState(0);

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
