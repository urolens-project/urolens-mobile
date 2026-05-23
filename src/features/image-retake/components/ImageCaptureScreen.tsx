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
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { useImageRetake } from '../hooks/useImageRetake';
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

export function ImageCaptureScreen() {
  // ── Route params ─────────────────────────────────────────────────────────
  // specimenId: always present
  // existingImageId: present when retaking from ResultReviewScreen
  const { specimenId, existingImageId } = useLocalSearchParams<{
    specimenId: string;
    existingImageId?: string;
  }>();

  // ── State ─────────────────────────────────────────────────────────────────
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<ScreenPhase>('idle');
  const [processed, setProcessed] = useState<ProcessedImage | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

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
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Photo library access is needed to upload images.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      allowsEditing: false,
      exif: false,
    });

    if (result.canceled || !result.assets[0]) return;

    try {
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
    if (!processed || !specimenId) return;

    setPhase('uploading');
    setUploadProgress(0);

    try {
      const form = buildUploadFormData(processed, specimenId);
      const response = await apiClient.post('/images/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (evt.total) {
            setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
          }
        },
      });

      const { id: resultId } = response.data;

      // Navigate to result review screen
      router.replace({
        pathname: '/(medtech)/sample/[id]',
        params: { id: specimenId, resultId },
      });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        'Upload failed. Please check your connection and try again.';
      setValidationError(msg);
      setPhase('previewing');
    }
  }, [processed, specimenId]);

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
        <View style={styles.previewContainer}>
          <Image source={{ uri: processed.uri }} style={styles.previewImage} resizeMode="contain" />
        </View>

        {/* Resolution badge */}
        <View style={styles.metaBadge}>
          <Text style={styles.metaText}>
            {processed.width} × {processed.height}px · {(processed.sizeBytes / 1024).toFixed(0)} KB
          </Text>
        </View>

        {validationError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{validationError}</Text>
          </View>
        )}

        <View style={styles.previewActions}>
          <TouchableOpacity style={[styles.button, styles.retakeButton]} onPress={handleRetapTap}>
            <Text style={styles.retakeLabel}>↩ Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.useButton]} onPress={handleUseImage}>
            <Text style={styles.useLabel}>Use This Image →</Text>
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
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.uploadingTitle}>Uploading image…</Text>
        <Text style={styles.uploadingProgress}>{uploadProgress}%</Text>
        <Text style={styles.uploadingSubtitle}>AI analysis will begin automatically</Text>
      </SafeAreaView>
    );
  }

  // ── Idle — live camera ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <CameraView style={styles.camera} facing="back" ref={cameraRef}>
        {/* Viewfinder guide */}
        <View style={styles.viewfinderGuide} />

        {/* Header */}
        <View style={styles.cameraHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backLabel}>✕</Text>
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

        {/* Bottom controls */}
        <View style={styles.cameraControls}>
          <TouchableOpacity style={styles.galleryButton} onPress={handleGalleryPick}>
            <Text style={styles.galleryIcon}>🖼</Text>
            <Text style={styles.galleryLabel}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureRing} onPress={handleCapture}>
            <View style={styles.captureButton} />
          </TouchableOpacity>

          <View style={{ width: 64 }} />
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { justifyContent: 'center', alignItems: 'center', gap: 12 },
  camera: { flex: 1 },

  // Camera UI
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
  backLabel: { color: '#fff', fontSize: 18 },
  cameraTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  instructionBanner: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    marginHorizontal: 24,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  instructionText: { color: '#E5E7EB', fontSize: 12, textAlign: 'center', lineHeight: 17 },
  cameraControls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 32,
  },
  galleryButton: { alignItems: 'center', gap: 4 },
  galleryIcon: { fontSize: 28 },
  galleryLabel: { color: '#E5E7EB', fontSize: 11 },
  captureRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },

  // Preview
  previewContainer: { flex: 1, backgroundColor: '#111' },
  previewImage: { flex: 1 },
  metaBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  metaText: { color: '#9CA3AF', fontSize: 12 },
  previewActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    backgroundColor: '#111',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  retakeButton: { backgroundColor: '#1F2937' },
  useButton: { backgroundColor: '#2563EB' },
  retakeLabel: { color: '#D1D5DB', fontWeight: '600', fontSize: 15 },
  useLabel: { color: '#fff', fontWeight: '600', fontSize: 15 },

  // Errors
  errorBanner: {
    backgroundColor: '#FEE2E2',
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  errorBannerCamera: {
    backgroundColor: 'rgba(220,38,38,0.85)',
    marginHorizontal: 24,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  errorText: { color: '#B91C1C', fontSize: 13, textAlign: 'center', lineHeight: 18 },

  // Upload progress
  uploadingTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  uploadingProgress: { color: '#60A5FA', fontSize: 32, fontWeight: '700' },
  uploadingSubtitle: { color: '#6B7280', fontSize: 13 },

  // Permission
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
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 8,
  },
  primaryLabel: { color: '#fff', fontWeight: '600', fontSize: 15 },
  secondaryButton: { paddingVertical: 10 },
  secondaryLabel: { color: '#60A5FA', fontSize: 14 },
});
