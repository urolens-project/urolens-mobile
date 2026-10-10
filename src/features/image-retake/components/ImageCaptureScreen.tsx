/**
 * ImageCaptureScreen — multi-image specimen capture
 *
 * Full-screen flow that lets the MedTech:
 *   a) Capture (or gallery-pick) a burst of fields of view, with a per-shot
 *      keep/retake step and a live-adjustable target count (10-30) — no
 *      separate "how many?" screen; the camera opens immediately
 *   b) Review the full set as a grid, retaking any slot or adding more
 *      before committing
 *   c) Upload the whole batch in a single request
 *
 * Flow:
 *   capturing    → (shot) → previewing
 *   previewing   → (Keep)    → capturing (next slot) | reviewing (set complete)
 *   previewing   → (Retake)  → capturing (same slot) [discard-confirm if replacing
 *                               an existing uploaded batch, first retake only]
 *   reviewing    → (tap slot) → capturing (that slot) → previewing → reviewing
 *   reviewing    → (Add Photo) → capturing (one more slot) → previewing → reviewing
 *   reviewing    → (Upload All) → uploading → [navigate to result]
 *
 * Receives specimenId and optional existingImageIds from route params.
 * Navigates to sample/[id] with resultId on success.
 */

import { useRef, useState, useCallback } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { useCameraPermissions, type CameraView } from 'expo-camera';
import { router } from 'expo-router';

import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { colors } from '@src/theme';

import { CameraPermissionRequest } from './CameraPermissionRequest';
import { CameraUnavailableView } from './CameraUnavailableView';
import { CameraLiveView } from './CameraLiveView';
import { CaptureGridReviewPanel } from './CaptureGridReviewPanel';
import { ImagePreviewPanel } from './ImagePreviewPanel';
import { UploadProgressView } from './UploadProgressView';
import { useBatchCapture } from '../hooks/useBatchCapture';
import { saveUploadedResult } from '../lib/saveUploadedResult';

export interface ImageCaptureScreenProps {
  specimenId: string;
  localSpecimenId: string;
  existingImageIds?: string[];
}

/**
 * @description Full-screen multi-image capture flow for a specimen: shooting (or
 * picking) each field of view with a per-shot retake and a live-adjustable target
 * count, reviewing the full set, and uploading it as one batch for AI analysis.
 * @param specimenId - Server specimen id, required to upload the batch.
 * @param localSpecimenId - Local specimen id, used to navigate to the result screen.
 * @param existingImageIds - Ids of a previously uploaded batch, if retaking one.
 */
export function ImageCaptureScreen({
  specimenId,
  localSpecimenId,
  existingImageIds = [],
}: ImageCaptureScreenProps): React.JSX.Element {
  const { isOnline } = useNetworkStatus();

  const batch = useBatchCapture(existingImageIds);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  const cameraRef = useRef<CameraView>(null);

  const handleCapture = useCallback((): void => {
    batch.captureFromCamera(async () => {
      if (!cameraRef.current) return undefined;
      return cameraRef.current.takePictureAsync({ quality: 1, exif: false });
    });
  }, [batch]);

  const handleUploadAll = useCallback(async (): Promise<void> => {
    if (!specimenId) {
      Alert.alert(
        'Missing Specimen ID',
        'The specimen server ID was not passed to this screen. Go back and try again.',
      );
      return;
    }
    if (!isOnline) {
      Alert.alert('Connection Required', 'A connection is required to upload these photos.');
      return;
    }

    try {
      const data = await batch.uploadBatch(specimenId);
      await saveUploadedResult(specimenId, data);

      router.replace({
        pathname: '/(medtech)/sample/[id]',
        params: { id: localSpecimenId, resultId: data.id },
      });
    } catch (err: unknown) {
      Alert.alert('Upload Failed', getUploadErrorMessage(err));
    }
  }, [batch, isOnline, localSpecimenId, specimenId]);

  const handleGoBack = useCallback((): void => {
    router.back();
  }, []);

  const handleCameraMountError = useCallback((): void => {
    setCameraError(
      'The camera could not be started on this device. You can still upload an image from the gallery.',
    );
  }, []);

  // ── Permission gate ───────────────────────────────────────────────────────
  if (!permission) {
    return <View style={styles.blank} />;
  }

  if (!permission.granted) {
    return (
      <CameraPermissionRequest
        validationError={batch.validationError}
        onRequestPermission={requestPermission}
        onGalleryPick={batch.pickFromGalleryForSlot}
        onGoBack={handleGoBack}
      />
    );
  }

  // ── Per-shot preview: keep or retake ──────────────────────────────────────
  if (batch.phase === 'previewing' && batch.pendingCapture) {
    return (
      <ImagePreviewPanel
        processed={batch.pendingCapture}
        validationError={batch.validationError}
        slotNumber={batch.activeSlotIndex + 1}
        targetCount={batch.targetCount}
        showDiscardModal={batch.showDiscardModal}
        isDiscarding={batch.isDiscarding}
        onGoBack={handleGoBack}
        onRetake={batch.retakePending}
        onKeep={batch.keepPending}
        onDiscardConfirm={batch.confirmDiscardExisting}
        onDiscardCancel={batch.cancelDiscardModal}
      />
    );
  }

  // ── Full-set review before upload ─────────────────────────────────────────
  if (batch.phase === 'reviewing') {
    return (
      <CaptureGridReviewPanel
        images={batch.capturedImages}
        validationError={batch.validationError}
        canAddMore={batch.canIncreaseTarget}
        onGoBack={handleGoBack}
        onRetakeSlot={batch.retakeSlot}
        onAddMore={() => batch.adjustTargetCount(1)}
        onUploadAll={handleUploadAll}
      />
    );
  }

  // ── Upload progress ────────────────────────────────────────────────────────
  if (batch.phase === 'uploading') {
    return <UploadProgressView progress={batch.uploadProgress} />;
  }

  // ── Camera hardware failed to initialize ─────────────────────────────────
  if (cameraError) {
    return (
      <CameraUnavailableView
        message={cameraError}
        validationError={batch.validationError}
        onGalleryPick={batch.pickFromGalleryForSlot}
        onGoBack={handleGoBack}
      />
    );
  }

  // ── Capturing (or re-shooting) the current slot ───────────────────────────
  return (
    <CameraLiveView
      cameraRef={cameraRef}
      validationError={batch.validationError}
      slotNumber={batch.activeSlotIndex + 1}
      targetCount={batch.targetCount}
      isRetake={batch.isRetakingSlot}
      canDecreaseTarget={batch.canDecreaseTarget}
      canIncreaseTarget={batch.canIncreaseTarget}
      onAdjustTarget={batch.adjustTargetCount}
      onMountError={handleCameraMountError}
      onGoBack={handleGoBack}
      onGalleryPick={batch.pickFromGalleryForSlot}
      onCapture={handleCapture}
    />
  );
}

function getUploadErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return 'Upload failed. Please check your connection and try again.';
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.black },
});
