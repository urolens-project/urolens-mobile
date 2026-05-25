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
 */

import { useLocalSearchParams } from 'expo-router';
import { ImageCaptureScreen } from '@features/image-retake/components/ImageCaptureScreen';

export default function CaptureRoute() {
  const { specimenId, localSpecimenId, existingImageId } = useLocalSearchParams<{
    specimenId: string;
    localSpecimenId: string;
    existingImageId?: string;
  }>();

  return (
    <ImageCaptureScreen
      specimenId={specimenId}
      localSpecimenId={localSpecimenId}
      existingImageId={existingImageId}
    />
  );
}
