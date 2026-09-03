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

import React, { useRef, useState, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';

import { Q } from '@nozbe/watermelondb';
import { database } from '@db/database';
import AnalysisResult from '@db/models/AnalysisResult';
import ManualOverride from '@db/models/ManualOverride';
import { DiscardConfirmationModal } from './DiscardConfirmationModal';
import {
  processCapture,
  processPickerAsset,
  buildUploadFormData,
  ImageResolutionError,
  ImageFormatError,
  ProcessedImage,
} from '@lib/camera/imageUtils';
import apiClient from '@lib/apiClient';

type ScreenPhase = 'idle' | 'previewing' | 'uploading' | 'discarding';

interface Props {
  specimenId: string;
  localSpecimenId: string;
  existingImageId?: string;
}

export function ImageCaptureScreen({ specimenId, localSpecimenId, existingImageId }: Props) {

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
  const handleCapture = useCallback(async () => {
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
  const handleGalleryPick = useCallback(async () => {
    setValidationError(null);

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Photo library access is needed to upload images.',
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
      if (err instanceof ImageResolutionError || err instanceof ImageFormatError) {
        setValidationError(err.message);
      } else {
        setValidationError('Could not process the selected image. Please try another.');
      }
    }
  }, []);

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUseImage = useCallback(async () => {
    console.log('[ImageCaptureScreen] handleUseImage tapped', { specimenId, localSpecimenId, hasProcessed: !!processed });
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
      const form = buildUploadFormData(processed, specimenId);

      // Axios's global 15 s timeout doesn't reliably abort multipart uploads
      // in React Native. Use an explicit AbortController with a 60 s ceiling.
      const controller = new AbortController();
      const uploadTimeout = setTimeout(() => controller.abort(), 60_000);

      let response;
      try {
        response = await apiClient.post('/images/upload', form, {
          // undefined clears the global application/json default so React Native
          // XHR sets multipart/form-data with the correct boundary automatically.
          headers: { 'Content-Type': undefined },
          timeout: 60_000,
          signal: controller.signal,
          onUploadProgress: (evt) => {
            if (evt.total) {
              setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
            }
          },
        });
      } finally {
        clearTimeout(uploadTimeout);
      }

      // Backend: both `id` and `result_id` equal the analysis result UUID; `image_id` is the image UUID.
      const { id: serverResultId, image_id: uploadedImageId, status, ai_findings, smart_diagnosis } = response.data;

      // Write result into WatermelonDB immediately so Sample Detail shows it
      // without waiting for the next background sync.
      await database.write(async () => {
        const collection = database.get<AnalysisResult>('analysis_results');
        const existing = await collection.query(Q.where('specimen_id', specimenId)).fetch();
        const findings = JSON.stringify(ai_findings ?? {});
        const diagnosisJson = smart_diagnosis ? JSON.stringify(smart_diagnosis) : null;

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
      const msg =
        err?.message ??
        'Upload failed. Please check your connection and try again.';
      Alert.alert('Upload Failed', msg);
      setValidationError(msg);
      setPhase('previewing');
    }
  }, [processed, specimenId, localSpecimenId]);

  // ── Retake ────────────────────────────────────────────────────────────────
  const handleRetapTap = useCallback(() => {
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

  const handleDiscardConfirm = useCallback(async () => {
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
    // 💡 Cast phase type back to ScreenPhase to bypass static block narrow restrictions
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
            <Ionicons name="alert-circle-outline" size={14} color="#B91C1C" />
            <Text style={styles.errorText}>{validationError}</Text>
          </View>
        )}

        {/* Action bar */}
        <View style={styles.previewActions}>
          <TouchableOpacity style={[styles.previewBtn, styles.retakeBtn]} onPress={handleRetapTap}>
            <Ionicons name="camera-reverse-outline" size={18} color="#D1D5DB" />
            <Text style={styles.retakeLabel}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.previewBtn, styles.useBtn]} onPress={handleUseImage}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
            <Text style={styles.useLabel}>Use This Image</Text>
          </TouchableOpacity>
        </View>

        <DiscardConfirmationModal
          visible={showDiscardModal}
          isLoading={isCurrentlyDiscarding}
          onConfirm={handleDiscardConfirm}
          onCancel={() => setShowDiscardModal(false)}
        />
      </SafeAreaView>
    );
  }

  // ── Upload progress phase ─────────────────────────────────────────────────
  if (phase === 'uploading') {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#2E7D7A" />
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
          onMountError={() =>
            setCameraError('The camera could not be started on this device. You can still upload an image from the gallery.')
          }
        />

        {/* Viewfinder guide */}
        <View style={styles.viewfinderGuide} />

        {/* Header */}
        <View style={styles.cameraHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={22} color="rgba(255,255,255,0.9)" />
          </TouchableOpacity>
          <Text style={styles.cameraTitle}>Specimen Capture</Text>
          <View style={{ width: 40 }} />
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
            <Ionicons name="images-outline" size={28} color="rgba(255,255,255,0.85)" />
            <Text style={styles.galleryLabel}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureRing} onPress={handleCapture}>
            <View style={styles.captureButton} />
          </TouchableOpacity>

          <View style={styles.captureSpacer} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { justifyContent: 'center', alignItems: 'center', gap: 12 },
  cameraWrapper: { flex: 1 },
  camera: { flex: 1 },

  // ── Camera UI ────────────────────────────────────────────────────────────────
  viewfinderGuide: {
    position: 'absolute',
    top: '25%',
    left: '10%',
    right: '10%',
    bottom: '30%',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 4,
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'android' ? 40 : 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  cameraTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  instructionBanner: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    marginHorizontal: 24,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  instructionText: { color: '#E5E7EB', fontSize: 12, textAlign: 'center', lineHeight: 17 },
  // space-between with equal-width gallery + spacer perfectly centers the capture ring
  cameraControls: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
  },
  galleryButton: { width: 60, alignItems: 'center', gap: 4 },
  galleryLabel: { color: '#E5E7EB', fontSize: 11 },
  captureRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  captureSpacer: { width: 60 },

  // ── Preview ───────────────────────────────────────────────────────────────────
  previewHeader: {
    backgroundColor: '#0D0D0D',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  previewMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 3,
  },
  previewContainer: { flex: 1, backgroundColor: '#111' },
  previewImage: { flex: 1 },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 16,
    backgroundColor: '#0D0D0D',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  previewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 7,
  },
  retakeBtn: {
    backgroundColor: '#1C2431',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  useBtn: { backgroundColor: '#2E7D7A' },
  retakeLabel: { color: '#D1D5DB', fontWeight: '600', fontSize: 15 },
  useLabel: { color: '#fff', fontWeight: '600', fontSize: 15 },

  // ── Errors ────────────────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  errorBannerCamera: {
    backgroundColor: 'rgba(220,38,38,0.85)',
    marginHorizontal: 24,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  errorText: { color: '#B91C1C', fontSize: 13, lineHeight: 18, flex: 1 },

  // ── Upload progress ───────────────────────────────────────────────────────────
  uploadingTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  uploadingProgress: { color: '#4DB6AC', fontSize: 36, fontWeight: '700' },
  uploadingSubtitle: { color: '#6B7280', fontSize: 13 },

  // ── Permission ────────────────────────────────────────────────────────────────
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  permissionTitle: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  permissionBody: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  primaryButton: {
    backgroundColor: '#2E7D7A',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
  },
  primaryLabel: { color: '#fff', fontWeight: '600', fontSize: 15 },
  secondaryButton: { paddingVertical: 10 },
  secondaryLabel: { color: '#4DB6AC', fontSize: 14 },
});
