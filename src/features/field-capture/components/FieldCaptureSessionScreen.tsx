/**
 * FieldCaptureSessionScreen — SDD Module 2 proposal, section 2.3/8.
 *
 * Multi-field capture session: repeats capture → field result (Proceed/Discard)
 * until at least the minimum number of fields is accepted. Replaces the single
 * "one image, one result" flow for a specimen with no result yet, or one already
 * in CAPTURING — the legacy single-image retake path (existingImageId set) stays
 * on ImageCaptureScreen, untouched; see app/(medtech)/capture.tsx for the split.
 *
 * Flow:
 *   idle       → (Take Photo / Gallery) → previewing
 *   previewing → (Use This Image)       → uploading → fieldResult
 *   previewing → (Retake)               → idle (no confirmation; nothing uploaded yet)
 *   fieldResult → (Proceed or Discard)  → idle, ready for the next field
 */

import { useCallback, useRef, useState } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { useCameraPermissions, type CameraView } from 'expo-camera';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { processCapture, processPickerAsset, isImageValidationError } from '@lib/camera/imageUtils';
import type { ProcessedImage } from '@lib/camera/imageUtils';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { colors } from '@src/theme';

import { CameraPermissionRequest } from '@features/image-retake/components/CameraPermissionRequest';
import { CameraUnavailableView } from '@features/image-retake/components/CameraUnavailableView';
import { CameraLiveView } from '@features/image-retake/components/CameraLiveView';
import { ImagePreviewPanel } from '@features/image-retake/components/image-preview-panel';
import { UploadProgressView } from '@features/image-retake/components/UploadProgressView';
import { IMAGE_RETAKE_TEXT } from '@features/image-retake/constants/imageRetakeText.constant';

import { FieldResultScreen } from './FieldResultScreen';
import { FIELD_CAPTURE_TEXT } from '../constants/fieldCaptureText.constant';
import { useFieldCapture } from '../hooks/useFieldCapture';
import { useFieldActions } from '../hooks/useFieldActions';
import type { CapturedField, Magnification } from '../types';

type ScreenPhase = 'idle' | 'previewing' | 'uploading' | 'fieldResult';

export interface FieldCaptureSessionScreenProps {
  specimenId: string;
  localSpecimenId: string;
}

/**
 * @description Runs a multi-field capture session for one specimen: capture, review
 * one field at a time (Proceed/Discard), repeat until the minimum is reached.
 * @param specimenId - Server specimen id, required to upload each field.
 * @param localSpecimenId - Local specimen id, kept for parity with the route params
 * (not yet used — Submit for Verification, a separate screen, navigates on from here).
 */
export function FieldCaptureSessionScreen({
  specimenId,
}: FieldCaptureSessionScreenProps): React.JSX.Element {
  const { isOnline } = useNetworkStatus();
  const { captureField, isLoading: isUploading } = useFieldCapture();
  const { acceptField, discardField, isLoading: isActing } = useFieldActions();

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<ScreenPhase>('idle');
  const [processed, setProcessed] = useState<ProcessedImage | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [magnification, setMagnification] = useState<Magnification>('HPF');
  const [capturedField, setCapturedField] = useState<CapturedField | null>(null);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [minFields, setMinFields] = useState(10);
  const [thumbnails, setThumbnails] = useState<string[]>([]);

  const cameraRef = useRef<CameraView>(null);

  // ── Capture from camera ───────────────────────────────────────────────────
  const handleCapture = useCallback(async (): Promise<void> => {
    if (!cameraRef.current) return;
    setValidationError(null);

    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 1, exif: false });
      if (!picture) return;

      const img = await processCapture(picture as any);
      setProcessed(img);
      setPhase('previewing');
    } catch (err) {
      if (isImageValidationError(err)) {
        setValidationError(err.message);
      } else {
        setValidationError(IMAGE_RETAKE_TEXT.captureFailedMessage);
      }
    }
  }, []);

  // ── Pick from gallery ─────────────────────────────────────────────────────
  const handleGalleryPick = useCallback(async (): Promise<void> => {
    setValidationError(null);

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          IMAGE_RETAKE_TEXT.galleryAccessDeniedTitle,
          IMAGE_RETAKE_TEXT.galleryAccessDeniedMessage,
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: false,
        exif: false,
      });

      if (result.canceled || !result.assets[0]) return;

      const img = await processPickerAsset(result.assets[0]);
      setProcessed(img);
      setPhase('previewing');
    } catch (err) {
      if (isImageValidationError(err)) {
        setValidationError(err.message);
      } else {
        setValidationError(IMAGE_RETAKE_TEXT.galleryPickFailedMessage);
      }
    }
  }, []);

  // ── Upload the field ──────────────────────────────────────────────────────
  const handleUseImage = useCallback(async (): Promise<void> => {
    if (!processed) return;
    if (!specimenId) {
      Alert.alert(
        IMAGE_RETAKE_TEXT.missingSpecimenIdTitle,
        IMAGE_RETAKE_TEXT.missingSpecimenIdMessage,
      );
      return;
    }
    if (!isOnline) {
      setValidationError(FIELD_CAPTURE_TEXT.offlineUploadBlockedMessage);
      return;
    }

    setPhase('uploading');
    setUploadProgress(0);

    const field = await captureField(specimenId, processed, magnification, setUploadProgress);
    if (!field) {
      setValidationError(FIELD_CAPTURE_TEXT.uploadFailedFallbackMessage);
      setPhase('previewing');
      return;
    }

    setMinFields(field.minFields);
    setCapturedField(field);
    setPhase('fieldResult');
  }, [captureField, isOnline, magnification, processed, specimenId]);

  // ── Field result: Proceed / Discard ──────────────────────────────────────
  const handleProceed = useCallback(async (): Promise<void> => {
    if (!capturedField) return;
    const outcome = await acceptField(capturedField.localId);
    if (!outcome) return;
    setAcceptedCount(outcome.acceptedFieldCount);
    setThumbnails((prev) => [...prev, capturedField.localImageUri]);
    setCapturedField(null);
    setProcessed(null);
    setPhase('idle');
  }, [acceptField, capturedField]);

  const handleDiscardConfirmed = useCallback(async (): Promise<void> => {
    if (!capturedField) return;
    const outcome = await discardField(capturedField.localId);
    if (!outcome) return;
    setCapturedField(null);
    setProcessed(null);
    setPhase('idle');
  }, [capturedField, discardField]);

  const handleDiscardRequest = useCallback((): void => {
    Alert.alert(FIELD_CAPTURE_TEXT.discardModalTitle, FIELD_CAPTURE_TEXT.discardModalBody, [
      { text: FIELD_CAPTURE_TEXT.keepFieldLabel, style: 'cancel' },
      {
        text: FIELD_CAPTURE_TEXT.confirmDiscardLabel,
        style: 'destructive',
        onPress: handleDiscardConfirmed,
      },
    ]);
  }, [handleDiscardConfirmed]);

  // ── Retake before upload — simple reset, nothing to undo server-side ────
  const handleRetake = useCallback((): void => {
    setProcessed(null);
    setValidationError(null);
    setPhase('idle');
  }, []);

  const handleToggleMagnification = useCallback((): void => {
    setMagnification((m) => (m === 'HPF' ? 'LPF' : 'HPF'));
  }, []);

  const handleGoBack = useCallback((): void => {
    router.back();
  }, []);

  const handleCameraMountError = useCallback((): void => {
    setCameraError(IMAGE_RETAKE_TEXT.cameraMountErrorMessage);
  }, []);

  // ── Permission gate ───────────────────────────────────────────────────────
  if (!permission) {
    return <View style={styles.blank} />;
  }
  if (!permission.granted) {
    return (
      <CameraPermissionRequest
        validationError={validationError}
        onRequestPermission={requestPermission}
        onGalleryPick={handleGalleryPick}
        onGoBack={handleGoBack}
      />
    );
  }

  // ── Field result phase ────────────────────────────────────────────────────
  if (phase === 'fieldResult' && capturedField) {
    return (
      <FieldResultScreen
        field={capturedField}
        isSubmitting={isActing}
        errorMessage={null}
        onProceed={handleProceed}
        onDiscard={handleDiscardRequest}
      />
    );
  }

  // ── Preview phase ─────────────────────────────────────────────────────────
  if (phase === 'previewing' && processed) {
    return (
      <ImagePreviewPanel
        processed={processed}
        validationError={validationError}
        onGoBack={handleGoBack}
        onRetake={handleRetake}
        onUseImage={handleUseImage}
      />
    );
  }

  // ── Upload progress phase ─────────────────────────────────────────────────
  if (phase === 'uploading' || isUploading) {
    return <UploadProgressView progress={uploadProgress} />;
  }

  // ── Camera hardware failed to initialize ─────────────────────────────────
  if (cameraError) {
    return (
      <CameraUnavailableView
        message={cameraError}
        validationError={validationError}
        onGalleryPick={handleGalleryPick}
        onGoBack={handleGoBack}
      />
    );
  }

  // ── Idle — live camera ────────────────────────────────────────────────────
  return (
    <CameraLiveView
      cameraRef={cameraRef}
      validationError={validationError}
      onMountError={handleCameraMountError}
      onGoBack={handleGoBack}
      onGalleryPick={handleGalleryPick}
      onCapture={handleCapture}
      fieldSession={{
        acceptedCount,
        minFields,
        magnification,
        onToggleMagnification: handleToggleMagnification,
        thumbnails,
      }}
    />
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.black },
});
