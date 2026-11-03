/**
 * FieldCaptureSessionScreen — SDD Module 2 proposal, section 2.3/8.
 *
 * Multi-field capture session: repeats capture → field result (Proceed/Discard)
 * until at least the minimum number of fields is accepted. Replaces the single
 * "one image, one result" flow for a specimen with no result yet, or one already
 * in CAPTURING. The legacy single-image retake screen this used to coexist with
 * is gone — retaking a legacy result now happens on the website (mobile PR #55
 * review, #3).
 *
 * Flow:
 *   idle       → (Take Photo / Gallery) → previewing
 *   previewing → (Use This Image)       → uploading → fieldResult
 *   previewing → (Retake)               → idle (no confirmation; nothing uploaded yet)
 *   fieldResult → (Proceed or Discard)  → idle, ready for the next field
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { useCameraPermissions, type CameraView } from 'expo-camera';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { randomId } from '@nozbe/watermelondb/utils/common';
import { useMinFieldsStore } from '@lib/stores/minFieldsStore';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { processCapture, processPickerAsset, isImageValidationError } from '@lib/camera/imageUtils';
import type { ProcessedImage } from '@lib/camera/imageUtils';
import { useNetworkStatus } from '@hooks/useNetworkStatus';
import { synchronize } from '@db/sync/syncManager';
import { colors } from '@src/theme';

import { CameraPermissionRequest } from '@features/image-retake/components/CameraPermissionRequest';
import { CameraUnavailableView } from '@features/image-retake/components/CameraUnavailableView';
import { CameraLiveView } from '@features/image-retake/components/CameraLiveView';
import { ImagePreviewPanel } from '@features/image-retake/components/image-preview-panel';
import { UploadProgressView } from '@features/image-retake/components/UploadProgressView';
import { IMAGE_RETAKE_TEXT } from '@features/image-retake/constants/imageRetakeText.constant';

import { FieldResultScreen } from './FieldResultScreen';
import { UploadRetryModal } from './UploadRetryModal';
import { FIELD_CAPTURE_TEXT } from '../constants/fieldCaptureText.constant';
import { LAST_MAGNIFICATION_KEY } from '../constants/magnification.constant';
import { useFieldCapture } from '../hooks/useFieldCapture';
import { useFieldActions } from '../hooks/useFieldActions';
import { useFieldList } from '../hooks/useFieldList';
import { useCurrentlyUploadingFieldId } from '../hooks/useCurrentlyUploadingFieldId';
import { createQueuedFieldUpload } from '../lib/saveUploadedField';
import type { CapturedField, FieldThumbnail, Magnification } from '../types';

function isMagnification(value: string | null): value is Magnification {
  return value === 'HPF' || value === 'LPF';
}

type ScreenPhase = 'idle' | 'previewing' | 'uploading' | 'fieldResult';

export interface FieldCaptureSessionScreenProps {
  specimenId: string;
  localSpecimenId: string;
}

/**
 * @description Runs a multi-field capture session for one specimen: capture, review
 * one field at a time (Proceed/Discard), repeat until the minimum is reached.
 * @param specimenId - Server specimen id, required to upload each field.
 * @param localSpecimenId - Local specimen id, passed through to the field list screen
 * so Capture More Fields can return here.
 */
export function FieldCaptureSessionScreen({
  specimenId,
  localSpecimenId,
}: FieldCaptureSessionScreenProps): React.JSX.Element {
  const { isOnline } = useNetworkStatus();
  const { captureField, isLoading: isUploading } = useFieldCapture();
  const {
    acceptField,
    discardField,
    isLoading: isActing,
    error: fieldActionError,
  } = useFieldActions();

  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<ScreenPhase>('idle');
  const [processed, setProcessed] = useState<ProcessedImage | null>(null);
  // Generated once per photo, not per upload attempt: kept across a retried
  // Use Image after a failure (backend #108), so a retry whose first answer the
  // phone never saw doesn't analyse — or store — the same photo twice. A retake
  // or a new pick gets its own, since setProcessed and setCaptureId are always
  // set together.
  const [captureId, setCaptureId] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [magnification, setMagnification] = useState<Magnification>('HPF');
  const [capturedField, setCapturedField] = useState<CapturedField | null>(null);
  const [uploadRetry, setUploadRetry] = useState<{ visible: boolean; message: string }>({
    visible: false,
    message: '',
  });
  // Guards against a second gallery tap launching an overlapping batch while one
  // is still being queued — createQueuedFieldUpload's fieldNo depends on each call
  // fully completing before the next one starts (see handleBulkGalleryPick).
  const [isQueuingBulkUpload, setIsQueuingBulkUpload] = useState(false);
  // Read from the local DB rather than kept as local state: capture.tsx remounts this
  // screen on every focus (so a previous session's uploading/previewing state never
  // leaks into a fresh one), which would otherwise reset these back to empty every
  // time a MedTech returns from the field list — even though the fields themselves
  // were never lost.
  const { fields: dbFields, acceptedCount } = useFieldList(specimenId);
  const uploadingFieldId = useCurrentlyUploadingFieldId();
  // ACCEPTED fields plus, for a gallery bulk upload, PENDING_UPLOAD ones still
  // queued in the background — dropped again once analysis finishes (ANALYZED),
  // same as any other backlog field, decided from the field list instead.
  const thumbnails = useMemo(
    (): FieldThumbnail[] =>
      dbFields
        .filter((f) => (f.status === 'ACCEPTED' || f.status === 'PENDING_UPLOAD') && f.thumbnailUri)
        .map(
          (f): FieldThumbnail => ({
            localId: f.localId,
            thumbnailUri: f.thumbnailUri as string,
            status:
              f.status === 'ACCEPTED'
                ? 'accepted'
                : f.localId === uploadingFieldId
                  ? 'uploading'
                  : 'waiting',
          }),
        ),
    [dbFields, uploadingFieldId],
  );
  // Seeded from the last sync's server minimum (backend #105) so the counter before
  // this session's own first capture response reflects reality instead of the
  // hard-coded fallback.
  const [minFields, setMinFields] = useState(() => useMinFieldsStore.getState().minFields);

  const cameraRef = useRef<CameraView>(null);

  // Keeps the last-chosen magnification between captures instead of always
  // resetting to HPF (mobile PR #55 review, 3.15).
  useEffect((): void => {
    AsyncStorage.getItem(LAST_MAGNIFICATION_KEY)
      .then((stored): void => {
        if (isMagnification(stored)) setMagnification(stored);
      })
      .catch((err: unknown): void =>
        console.error('[FieldCapture] failed to load magnification', err),
      );
  }, []);

  // ── Capture from camera ───────────────────────────────────────────────────
  const handleCapture = useCallback(async (): Promise<void> => {
    if (!cameraRef.current) return;
    setValidationError(null);

    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 1, exif: false });
      if (!picture) return;

      const img = await processCapture(picture as any);
      setProcessed(img);
      setCaptureId(randomId());
      setPhase('previewing');
    } catch (err) {
      if (isImageValidationError(err)) {
        setValidationError(err.message);
      } else {
        setValidationError(IMAGE_RETAKE_TEXT.captureFailedMessage);
      }
    }
  }, []);

  // ── Bulk-queue a gallery multi-select — background upload, no preview ───────
  const handleBulkGalleryPick = useCallback(
    async (assets: ImagePicker.ImagePickerAsset[]): Promise<void> => {
      let queuedCount = 0;
      let failedCount = 0;

      // Sequential, not Promise.all: createQueuedFieldUpload reads the specimen's
      // current field count before writing its own row, so two overlapping calls
      // would both read the same count and collide on fieldNo. Awaiting each one
      // fully before starting the next keeps field numbers correct.
      for (const asset of assets) {
        try {
          const img = await processPickerAsset(asset);
          await createQueuedFieldUpload(specimenId, magnification, img.uri, randomId());
          queuedCount += 1;
        } catch {
          // Per-asset validation/processing failure — skip it, keep going; the
          // summary alert below reports the final counts either way.
          failedCount += 1;
        }
      }

      if (queuedCount > 0 && isOnline) {
        synchronize().catch((err: unknown): void =>
          console.error('[FieldCapture] bulk upload kickoff failed', err),
        );
      }

      Alert.alert(
        FIELD_CAPTURE_TEXT.bulkUploadQueuedTitle,
        FIELD_CAPTURE_TEXT.bulkUploadQueuedMessage(queuedCount, failedCount),
      );
    },
    [isOnline, magnification, specimenId],
  );

  // ── Pick from gallery ─────────────────────────────────────────────────────
  const handleGalleryPick = useCallback(async (): Promise<void> => {
    if (isQueuingBulkUpload) return;
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
        allowsMultipleSelection: true,
        // iOS defaults to .current, returning HEIC assets as-is (expo-image-picker
        // changelog, 37569) — getPickerMimeType only accepts JPEG/PNG, so an
        // unedited iPhone photo would fail format validation. Forcing .automatic
        // re-encodes HEIC to JPEG before it reaches us.
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Automatic,
      });

      if (result.canceled || !result.assets[0]) return;

      // A single pick keeps today's preview-then-confirm flow unchanged; only a
      // deliberate multi-select switches to the background bulk path.
      if (result.assets.length > 1) {
        setIsQueuingBulkUpload(true);
        try {
          await handleBulkGalleryPick(result.assets);
        } finally {
          setIsQueuingBulkUpload(false);
        }
        return;
      }

      const img = await processPickerAsset(result.assets[0]);
      setProcessed(img);
      setCaptureId(randomId());
      setPhase('previewing');
    } catch (err) {
      if (isImageValidationError(err)) {
        setValidationError(err.message);
      } else {
        setValidationError(IMAGE_RETAKE_TEXT.galleryPickFailedMessage);
      }
    }
  }, [handleBulkGalleryPick, isQueuingBulkUpload]);

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

    // Offline: no AI result is possible yet, so there's nothing to decide on.
    // Queue the upload and get straight back to the camera for the next shot —
    // this field joins the backlog on the field list once it's back online.
    if (!isOnline) {
      await createQueuedFieldUpload(specimenId, magnification, processed.uri, captureId);
      setProcessed(null);
      setValidationError(null);
      setPhase('idle');
      Alert.alert(
        FIELD_CAPTURE_TEXT.offlineCaptureQueuedTitle,
        FIELD_CAPTURE_TEXT.offlineCaptureQueuedMessage,
      );
      return;
    }

    setPhase('uploading');
    setUploadProgress(0);

    const outcome = await captureField(
      specimenId,
      processed,
      magnification,
      setUploadProgress,
      captureId,
    );
    if (outcome?.status === 'networkError') {
      // The upload never reached the server — offer a dedicated Try Again instead
      // of the generic inline error, keeping the captured image either way
      // (field-post-analysis-report.md, Section 2 item 7).
      setPhase('previewing');
      setUploadRetry({ visible: true, message: outcome.message });
      return;
    }
    if (!outcome || outcome.status === 'failed') {
      // A real analysis failure: keep the image, let the MedTech retry the upload
      // without recapturing.
      setValidationError(outcome?.message ?? FIELD_CAPTURE_TEXT.uploadFailedFallbackMessage);
      setPhase('previewing');
      return;
    }
    if (outcome.status === 'retake') {
      // The engine's input gate refused this exact photo — retrying the upload
      // would fail the same way again, so go back to the camera instead.
      setProcessed(null);
      setValidationError(outcome.message);
      setPhase('idle');
      return;
    }

    setMinFields(outcome.field.minFields);
    setCapturedField(outcome.field);
    setPhase('fieldResult');
  }, [captureField, captureId, isOnline, magnification, processed, specimenId]);

  // ── Field result: Proceed / Discard ──────────────────────────────────────
  const handleProceed = useCallback(async (): Promise<void> => {
    if (!capturedField) return;
    const outcome = await acceptField(capturedField.localId);
    if (!outcome) return;
    // acceptedCount and thumbnails come from useFieldList, which observes this write.
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

  // ── Upload retry modal (network failure) ─────────────────────────────────
  const handleUploadRetryTryAgain = useCallback((): void => {
    setUploadRetry({ visible: false, message: '' });
    void handleUseImage();
  }, [handleUseImage]);

  const handleUploadRetryCancel = useCallback((): void => {
    setUploadRetry({ visible: false, message: '' });
  }, []);

  // ── Retake before upload — simple reset, nothing to undo server-side ────
  const handleRetake = useCallback((): void => {
    setProcessed(null);
    setValidationError(null);
    setPhase('idle');
  }, []);

  const handleToggleMagnification = useCallback((): void => {
    setMagnification((m) => {
      const next = m === 'HPF' ? 'LPF' : 'HPF';
      AsyncStorage.setItem(LAST_MAGNIFICATION_KEY, next).catch((err: unknown): void =>
        console.error('[FieldCapture] failed to persist magnification', err),
      );
      return next;
    });
  }, []);

  const handleViewFieldList = useCallback((): void => {
    router.push({
      pathname: '/(medtech)/field-list',
      params: { specimenId, localSpecimenId, minFields: String(minFields) },
    });
  }, [localSpecimenId, minFields, specimenId]);

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
        errorMessage={fieldActionError?.message ?? null}
        onProceed={handleProceed}
        onDiscard={handleDiscardRequest}
      />
    );
  }

  // ── Preview phase ─────────────────────────────────────────────────────────
  if (phase === 'previewing' && processed) {
    return (
      <>
        <ImagePreviewPanel
          processed={processed}
          validationError={validationError}
          onGoBack={handleGoBack}
          onRetake={handleRetake}
          onUseImage={handleUseImage}
        />
        <UploadRetryModal
          visible={uploadRetry.visible}
          message={uploadRetry.message}
          onTryAgain={handleUploadRetryTryAgain}
          onCancel={handleUploadRetryCancel}
        />
      </>
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
        onViewFieldList: handleViewFieldList,
        thumbnails,
      }}
    />
  );
}

const styles = StyleSheet.create({
  blank: { flex: 1, backgroundColor: colors.black },
});
