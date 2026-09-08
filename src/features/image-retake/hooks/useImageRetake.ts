// src/features/image-retake/hooks/useImageRetake.ts
/**
 * useImageRetake — T2.7 Image Capture, Validation & Upload hook.
 *
 * Responsibilities:
 *  1. Process a captured/picked asset (EXIF strip + resolution validation) and
 *     hold it for preview.
 *  2. Upload the previewed image via multipart POST /images/upload with
 *     progress tracking, once the caller confirms it ("Use This Image").
 *  3. Handle Retake flow: POST /images/{id}/discard.
 *
 * Capture and upload are split into separate steps (rather than one atomic
 * select-and-upload call) because the UI shows a preview the MedTech can
 * retake before committing to the upload.
 */

import { useState, useCallback, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { CameraCapturedPicture } from 'expo-camera';
import apiClient from '@lib/apiClient';
import {
  processCapture,
  processPickerAsset,
  buildUploadFormData,
  ProcessedImage,
  ImageResolutionError,
  ImageFormatError,
} from '@lib/camera/imageUtils';
import { uploadImageViaXhr, UploadImageResponse } from '@lib/camera/uploadImage';

export type UploadState =
  | { phase: 'idle' }
  | { phase: 'processing' }            // EXIF strip + validation
  | { phase: 'previewing' }
  | { phase: 'uploading'; progress: number }  // 0–100
  | { phase: 'error'; message: string };

export interface UseImageRetakeReturn {
  state: UploadState;
  capturedImage: ProcessedImage | null;
  /** Pass a function that captures a photo (e.g. cameraRef.current.takePictureAsync). */
  captureFromCamera: (takePicture: () => Promise<CameraCapturedPicture | undefined>) => Promise<void>;
  pickFromGallery: () => Promise<void>;
  /** Uploads the currently previewed image. Throws on failure so callers can show their own alert. */
  confirmUpload: (specimenId: string) => Promise<UploadImageResponse>;
  discardImage: (imageId: string) => Promise<void>;
  reset: () => void;
}

export function useImageRetake(): UseImageRetakeReturn {
  const [state, setState] = useState<UploadState>({ phase: 'idle' });
  const [capturedImage, setCapturedImage] = useState<ProcessedImage | null>(null);
  // Abort controller so we can cancel an in-flight upload on unmount
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState({ phase: 'idle' });
    setCapturedImage(null);
  }, []);

  // ── Capture / pick → process → preview ────────────────────────────────────

  const captureFromCamera = useCallback(
    async (takePicture: () => Promise<CameraCapturedPicture | undefined>) => {
      setState({ phase: 'processing' });
      try {
        const picture = await takePicture();
        if (!picture) {
          setState({ phase: 'idle' });
          return;
        }
        const processed = await processCapture(picture);
        setCapturedImage(processed);
        setState({ phase: 'previewing' });
      } catch (err: unknown) {
        setState({ phase: 'error', message: _extractMessage(err) });
      }
    },
    [],
  );

  const pickFromGallery = useCallback(async () => {
    setState({ phase: 'processing' });
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Photo library permission is required. Please enable it in Settings.');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1, // no additional compression — we handle it in imageUtils
        allowsEditing: false,
        exif: false, // don't even load EXIF into memory
      });

      if (result.canceled || !result.assets[0]) {
        setState({ phase: 'idle' });
        return;
      }

      const processed = await processPickerAsset(result.assets[0]);
      setCapturedImage(processed);
      setState({ phase: 'previewing' });
    } catch (err: unknown) {
      setState({ phase: 'error', message: _extractMessage(err) });
    }
  }, []);

  // ── Confirm → upload ───────────────────────────────────────────────────────

  const confirmUpload = useCallback(
    async (specimenId: string): Promise<UploadImageResponse> => {
      if (!capturedImage) {
        throw new Error('No image has been captured yet.');
      }

      setState({ phase: 'uploading', progress: 0 });
      abortRef.current = new AbortController();

      try {
        const form = await buildUploadFormData(capturedImage, specimenId);
        const data = await uploadImageViaXhr(form, abortRef.current.signal, (progress) => {
          setState({ phase: 'uploading', progress });
        });
        return data;
      } catch (err: unknown) {
        if (!_isAbortError(err)) {
          setState({ phase: 'error', message: _extractMessage(err) });
        }
        throw err;
      }
    },
    [capturedImage],
  );

  // ── Discard + retake flow ─────────────────────────────────────────────────

  const discardImage = useCallback(async (imageId: string) => {
    try {
      await apiClient.post(`/images/${imageId}/discard`);
      // Reset to idle so the capture screen re-opens
      reset();
    } catch (err: unknown) {
      setState({ phase: 'error', message: _extractMessage(err) });
      throw err;
    }
  }, [reset]);

  return {
    state,
    capturedImage,
    captureFromCamera,
    pickFromGallery,
    confirmUpload,
    discardImage,
    reset,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _isAbortError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === 'AbortError' || err.name === 'CanceledError')
  );
}

function _extractMessage(err: unknown): string {
  if (err instanceof ImageResolutionError || err instanceof ImageFormatError) {
    return err.message;
  }
  if (err instanceof Error) {
    const axiosData = (err as any).response?.data;
    if (axiosData?.error?.message) return axiosData.error.message;
    return err.message;
  }
  return 'An unexpected error occurred. Please try again.';
}
