import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';

import { ImageCaptureScreen } from '@features/image-retake/components/ImageCaptureScreen';
import { FieldCaptureSessionScreen } from '@features/field-capture/components/FieldCaptureSessionScreen';

/**
 * @description Route entry for /capture. Reads specimen params here, where
 * useLocalSearchParams is reliable, and forwards them on. Expects `specimenId`
 * (required), `localSpecimenId` (WatermelonDB local id, used for return
 * navigation), and `existingImageId` (present on the legacy single-image retake
 * path only — ImageCaptureScreen; its absence means a fresh multi-field capture
 * session — FieldCaptureSessionScreen, SDD Module 2 proposal).
 */
export default function CaptureRoute(): React.JSX.Element {
  const { specimenId, localSpecimenId, existingImageId } = useLocalSearchParams<{
    specimenId: string;
    localSpecimenId: string;
    existingImageId?: string;
  }>();

  const [mountKey, setMountKey] = useState(0);

  // Remount on every focus so a previous session's uploading/previewing state
  // never leaks into a fresh retake or a fresh capture session.
  useFocusEffect(
    useCallback(() => {
      setMountKey((k) => k + 1);
    }, []),
  );

  if (existingImageId) {
    return (
      <ImageCaptureScreen
        key={mountKey}
        specimenId={specimenId}
        localSpecimenId={localSpecimenId}
        existingImageId={existingImageId}
      />
    );
  }

  return (
    <FieldCaptureSessionScreen
      key={mountKey}
      specimenId={specimenId}
      localSpecimenId={localSpecimenId}
    />
  );
}
