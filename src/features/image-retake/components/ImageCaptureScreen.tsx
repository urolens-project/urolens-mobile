/**
 * ImageCaptureScreen — T2.7
 *
 * Full-screen camera UI that lets the MedTech:
 *   a) Capture a photo using the device camera, or
 *   b) Upload from the gallery.
 *
 * Flow:
 *   idle      → (Take Photo) → previewing → (Use This Image) → uploading → [navigate to result]
 *   idle      → (Gallery)    → previewing → (Use This Image) → uploading → [navigate to result]
 *   previewing → (Retake)    → idle (discard modal if imageId exists on an existing result)
 *
 * Receives specimenId and optional existingImageId from route params.
 * Navigates to sample/[id] with resultId on success.
 */

import { useRef, useState, useCallback } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { useCameraPermissions, type CameraView } from 'expo-camera';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import {
  processCapture,
  processPickerAsset,
  buildUploadFormData,
  ImageResolutionError,
  ImageFormatError,
} from '@lib/camera/imageUtils';
import type { ProcessedImage } from '@lib/camera/imageUtils';
import { uploadImageViaXhr } from '@lib/camera/uploadImage';
import apiClient from '@lib/apiClient';
import { colors } from '@src/theme';

import { CameraPermissionRequest } from './CameraPermissionRequest';
import { CameraUnavailableView } from './CameraUnavailableView';
import { CameraLiveView } from './CameraLiveView';
import { ImagePreviewPanel } from './ImagePreviewPanel';
import { UploadProgressView } from './UploadProgressView';
import { saveUploadedResult } from '../lib/saveUploadedResult';

type ScreenPhase = 'idle' | 'previewing' | 'uploading' | 'discarding';

export interface ImageCaptureScreenProps {
  specimenId: string;
  localSpecimenId: string;
  existingImageId?: string;
}

/**
 * @description Full-screen camera flow for capturing (or picking) a specimen image,
 * previewing it, and uploading it for AI analysis, with a guarded discard/retake path.
 * @param specimenId - Server specimen id, required to upload the image.
 * @param localSpecimenId - Local specimen id, used to navigate to the result screen.
 * @param existingImageId - Id of a previously uploaded image, if retaking one.
 */
export function ImageCaptureScreen({
  specimenId,
  localSpecimenId,
  existingImageId,
}: ImageCaptureScreenProps): React.JSX.Element {
  // ── State ─────────────────────────────────────────────────────────────────
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<ScreenPhase>('idle');
  const [processed, setProcessed] = useState<ProcessedImage | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

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
      if (err instanceof ImageResolutionError || err instanceof ImageFormatError) {
        setValidationError(err.message);
      } else {
        setValidationError('Failed to capture image. Please try again.');
      }
    }
  }, []);

  // ── Pick from gallery ─────────────────────────────────────────────────────
  const handleGalleryPick = useCallback(async (): Promise<void> => {
    setValidationError(null);

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Photo library access is needed to upload images.');
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
      if (err instanceof ImageResolutionError || err instanceof ImageFormatError) {
        setValidationError(err.message);
      } else {
        setValidationError('Could not process the selected image. Please try another.');
      }
    }
  }, []);

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUseImage = useCallback(async (): Promise<void> => {
    // Defensive guard with visible feedback so silent failures are surfaced
    if (!processed) return;
    if (!specimenId) {
      Alert.alert(
        'Missing Specimen ID',
        'The specimen server ID was not passed to this screen. Go back and try again.',
      );
      return;
    }

    setPhase('uploading');
    setUploadProgress(0);

    try {
      const form = await buildUploadFormData(processed, specimenId);
      const controller = new AbortController();

      const data = await uploadImageViaXhr(form, controller.signal, (progress) => {
        setUploadProgress(progress);
      });

      await saveUploadedResult(specimenId, data);

      router.replace({
        pathname: '/(medtech)/sample/[id]',
        params: { id: localSpecimenId, resultId: data.id },
      });
    } catch (err: any) {
      // apiClient interceptor rejects with a plain ApiError { code, message },
      // not an Axios error, so read .message directly.
      const msg = err?.message ?? 'Upload failed. Please check your connection and try again.';
      Alert.alert('Upload Failed', msg);
      setValidationError(msg);
      setPhase('previewing');
    }
  }, [processed, specimenId, localSpecimenId]);

  // ── Retake ────────────────────────────────────────────────────────────────
  const handleRetapTap = useCallback((): void => {
    if (existingImageId) {
      // Retaking from an existing result — must go through discard flow
      setShowDiscardModal(true);
    } else {
      // First capture attempt, no existing result yet — just reset
      setProcessed(null);
      setValidationError(null);
      setPhase('idle');
    }
  }, [existingImageId]);

  const handleDiscardConfirm = useCallback(async (): Promise<void> => {
    if (!existingImageId) return;
    setPhase('discarding');

    try {
      await apiClient.post(`/images/${existingImageId}/discard`);
      setShowDiscardModal(false);
      setProcessed(null);
      setValidationError(null);
      setPhase('idle');
    } catch {
      setShowDiscardModal(false);
      setPhase('previewing');
      Alert.alert('Error', 'Could not discard the image. Please try again.');
    }
  }, [existingImageId]);

  const handleDiscardCancel = useCallback((): void => {
    setShowDiscardModal(false);
  }, []);

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
        onRequestPermission={requestPermission}
        onGalleryPick={handleGalleryPick}
      />
    );
  }

  // ── Preview phase ─────────────────────────────────────────────────────────
  if (phase === 'previewing' && processed) {
    const isCurrentlyDiscarding = (phase as ScreenPhase) === 'discarding';

    return (
      <ImagePreviewPanel
        processed={processed}
        validationError={validationError}
        showDiscardModal={showDiscardModal}
        isDiscarding={isCurrentlyDiscarding}
        onRetake={handleRetapTap}
        onUseImage={handleUseImage}
        onDiscardConfirm={handleDiscardConfirm}
        onDiscardCancel={handleDiscardCancel}
      />
    );
  }

  // ── Upload progress phase ─────────────────────────────────────────────────
  if (phase === 'uploading') {
    return <UploadProgressView progress={uploadProgress} />;
  }

  // ── Camera hardware failed to initialize ─────────────────────────────────
  if (cameraError) {
    return <CameraUnavailableView message={cameraError} onGalleryPick={handleGalleryPick} />;
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
    />
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.black },
});
