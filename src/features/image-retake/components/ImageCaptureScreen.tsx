// src/features/image-retake/components/ImageCaptureScreen.tsx
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
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { Q } from '@nozbe/watermelondb';
import { database } from '@db/database';
import type AnalysisResult from '@db/models/AnalysisResult';
import type ManualOverride from '@db/models/ManualOverride';
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
import { colors, fontWeight, radius, spacing, typography } from '@src/theme';

import { Icon } from '@components/Icon';

import { DiscardConfirmationModal } from './DiscardConfirmationModal';

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

      // Backend: both `id` and `resultId` equal the analysis result UUID; `imageId` is the image UUID.
      const { id: serverResultId, imageId: uploadedImageId, status, aiFindings, smartDiagnosis } = data;

      // Write result into WatermelonDB immediately so Sample Detail shows it
      // without waiting for the next background sync.
      await database.write(async () => {
        const collection = database.get<AnalysisResult>('analysis_results');
        const existing = await collection.query(Q.where('specimen_id', specimenId)).fetch();
        const findings = JSON.stringify(aiFindings ?? {});
        const diagnosisJson = smartDiagnosis ? JSON.stringify(smartDiagnosis) : null;

        if (existing.length > 0) {
          // Backend reuses the same result_id on retake (UPDATE, not INSERT),
          // so always purge stale overrides before writing new AI findings.
          if (existing[0].serverId) {
            const staleOverrides = await database
              .get<ManualOverride>('manual_overrides')
              .query(Q.where('result_id', existing[0].serverId))
              .fetch();
            for (const o of staleOverrides) {
              await o.destroyPermanently();
            }
          }
          await existing[0].update((r) => {
            r.serverId = serverResultId;
            r.imageId = uploadedImageId ?? null;
            r.status = status;
            r.aiFindingsJson = findings;
            r.smartDiagnosisJson = diagnosisJson;
            r.smartDiagnosisUnavailable = false;
            r.isSynced = false;
            r.syncedAt = new Date().toISOString();
          });
        } else {
          await collection.create((r) => {
            r.serverId = serverResultId;
            r.specimenId = specimenId;
            r.imageId = uploadedImageId ?? null;
            r.status = status;
            r.aiFindingsJson = findings;
            r.smartDiagnosisJson = diagnosisJson;
            r.smartDiagnosisUnavailable = false;
            r.isSynced = false;
            r.createdAt = Date.now();
            r.syncedAt = new Date().toISOString();
          });
        }
      });

      router.replace({
        pathname: '/(medtech)/sample/[id]',
        params: { id: localSpecimenId, resultId: serverResultId },
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
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionBody}>
            UroLens needs camera access to photograph specimens for AI analysis.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
            <Text style={styles.primaryLabel}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleGalleryPick}>
            <Text style={styles.secondaryLabel}>Upload from Gallery Instead</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Preview phase ─────────────────────────────────────────────────────────
  if (phase === 'previewing' && processed) {
    const isCurrentlyDiscarding = (phase as ScreenPhase) === 'discarding';

    return (
      <SafeAreaView style={styles.container}>
        {/* Preview header */}
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>Image Preview</Text>
          <Text style={styles.previewMeta}>
            {processed.width} × {processed.height}px · {(processed.sizeBytes / 1024).toFixed(0)} KB
          </Text>
        </View>

        {/* Full-screen image */}
        <View style={styles.previewContainer}>
          <Image source={{ uri: processed.uri }} style={styles.previewImage} resizeMode="contain" />
        </View>

        {validationError && (
          <View style={styles.errorBanner}>
            <Icon name="alert-circle-outline" size={14} color={colors.red700} />
            <Text style={styles.errorText}>{validationError}</Text>
          </View>
        )}

        {/* Action bar */}
        <View style={styles.previewActions}>
          <TouchableOpacity
            style={[styles.previewBtn, styles.retakeBtn]}
            onPress={handleRetapTap}
            testID="retake-button"
          >
            <Icon name="camera-reverse-outline" size={18} color={colors.gray300} />
            <Text style={styles.retakeLabel}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.previewBtn, styles.useBtn]}
            onPress={handleUseImage}
            testID="use-image-button"
          >
            <Icon name="checkmark-circle-outline" size={18} color={colors.white} />
            <Text style={styles.useLabel}>Use This Image</Text>
          </TouchableOpacity>
        </View>

        <DiscardConfirmationModal
          visible={showDiscardModal}
          isLoading={isCurrentlyDiscarding}
          onConfirm={handleDiscardConfirm}
          onCancel={handleDiscardCancel}
        />
      </SafeAreaView>
    );
  }

  // ── Upload progress phase ─────────────────────────────────────────────────
  if (phase === 'uploading') {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.teal} />
        <Text style={styles.uploadingTitle}>Uploading image…</Text>
        <Text style={styles.uploadingProgress}>{uploadProgress}%</Text>
        <Text style={styles.uploadingSubtitle}>AI analysis will begin automatically</Text>
      </SafeAreaView>
    );
  }

  // ── Camera hardware failed to initialize ─────────────────────────────────
  if (cameraError) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionBox}>
          <Text style={styles.permissionTitle}>Camera Unavailable</Text>
          <Text style={styles.permissionBody}>{cameraError}</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleGalleryPick}>
            <Text style={styles.secondaryLabel}>Upload from Gallery Instead</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Idle — live camera ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraWrapper}>
        {/* Camera fills the wrapper; no children allowed by CameraView */}
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          ref={cameraRef}
          onMountError={handleCameraMountError}
        />

        {/* Viewfinder guide */}
        <View style={styles.viewfinderGuide} />

        {/* Header */}
        <View style={styles.cameraHeader}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Icon name="close" size={22} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <Text style={styles.cameraTitle}>Specimen Capture</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Instructions */}
        <View style={styles.instructionBanner}>
          <Text style={styles.instructionText}>
            Position the microscope eyepiece over the camera lens. Min. resolution: 640 × 480.
          </Text>
        </View>

        {validationError && (
          <View style={styles.errorBannerCamera}>
            <Text style={styles.errorText}>{validationError}</Text>
          </View>
        )}

        {/* Bottom controls — gallery left, capture centered, mirror spacer right */}
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.galleryButton} onPress={handleGalleryPick}>
            <Icon name="images-outline" size={28} color="rgba(255,255,255,0.85)" />
            <Text style={styles.galleryLabel}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.captureRing}
            onPress={handleCapture}
            testID="capture-button"
          >
            <View style={styles.captureButton} />
          </TouchableOpacity>

          <View style={styles.captureSpacer} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.black },
  centered: { justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  cameraWrapper: { flex: 1 },

  // ── Camera UI ────────────────────────────────────────────────────────────────
  viewfinderGuide: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    right: '10%',
    bottom: '30%',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: radius.xs,
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerSpacer: { width: 40 },
  cameraTitle: { ...typography.title, color: colors.white },
  instructionBanner: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    marginHorizontal: spacing.xxl,
    borderRadius: radius.sm,
    padding: spacing.smd,
    marginTop: spacing.sm,
  },
  instructionText: { ...typography.caption, color: colors.gray200, textAlign: 'center', lineHeight: 17 },
  // space-between with equal-width gallery + spacer perfectly centers the capture ring
  cameraControls: {
    position: 'absolute',
    bottom: spacing.jumbo,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.huge,
  },
  galleryButton: { width: 60, alignItems: 'center', gap: spacing.xs },
  galleryLabel: { ...typography.micro, color: colors.gray200 },
  captureRing: {
    // Fixed 80x80 circle: radius is half the box, not a scale value.
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    // Fixed 64x64 circle: radius is half the box, not a scale value.
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
  },
  captureSpacer: { width: 60 },

  // ── Preview ───────────────────────────────────────────────────────────────────
  previewHeader: {
    backgroundColor: colors.blackAlt,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.mlg,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  previewTitle: {
    ...typography.title,
    color: colors.white,
  },
  previewMeta: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: spacing.xs,
  },
  previewContainer: { flex: 1, backgroundColor: colors.blackAlt },
  previewImage: { flex: 1 },
  previewActions: {
    flexDirection: 'row',
    gap: spacing.smd,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
    backgroundColor: colors.blackAlt,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  retakeBtn: {
    backgroundColor: colors.navyAlt,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  useBtn: { backgroundColor: colors.teal },
  retakeLabel: { ...typography.subtitle, fontWeight: fontWeight.semibold, color: colors.gray300 },
  useLabel: { ...typography.subtitle, fontWeight: fontWeight.semibold, color: colors.white },

  // ── Errors ────────────────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.red100,
    marginHorizontal: spacing.lg,
    borderRadius: radius.sm,
    padding: spacing.smd,
    marginBottom: spacing.sm,
  },
  errorBannerCamera: {
    backgroundColor: 'rgba(220,38,38,0.85)',
    marginHorizontal: spacing.xxl,
    borderRadius: radius.sm,
    padding: spacing.smd,
    marginTop: spacing.sm,
  },
  errorText: { ...typography.body, color: colors.red700, lineHeight: 18, flex: 1 },

  // ── Upload progress ───────────────────────────────────────────────────────────
  uploadingTitle: { ...typography.titleLg, color: colors.white },
  uploadingProgress: { ...typography.jumbo, color: colors.tealAlt },
  uploadingSubtitle: { ...typography.body, color: colors.gray500 },

  // ── Permission ────────────────────────────────────────────────────────────────
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
    gap: spacing.md,
  },
  permissionTitle: {
    ...typography.heading,
    fontWeight: fontWeight.bold,
    color: colors.white,
    textAlign: 'center',
  },
  permissionBody: { ...typography.bodyLg, color: colors.gray400, textAlign: 'center', lineHeight: 20 },
  primaryButton: {
    backgroundColor: colors.teal,
    paddingVertical: spacing.mlg,
    paddingHorizontal: spacing.xxxl,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
  },
  primaryLabel: { ...typography.subtitle, fontWeight: fontWeight.semibold, color: colors.white },
  secondaryButton: { paddingVertical: spacing.smd },
  secondaryLabel: { ...typography.bodyLg, color: colors.tealAlt },
});
