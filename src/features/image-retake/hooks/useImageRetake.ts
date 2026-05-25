// src/features/image-retake/hooks/useImageRetake.ts
/**
 * useImageRetake — T2.7 Image Capture, Validation & Upload hook.
 *
 * Responsibilities:
 *  1. Open camera or gallery picker.
 *  2. Process the raw asset (EXIF strip + resolution validation).
 *  3. Upload via multipart POST /images/upload with progress tracking.
 *  4. Handle Retake flow: show DiscardConfirmationModal → POST /images/{id}/discard.
 *
 * Note: image capture is inherently an online action.
 * Upload progress is reported via onUploadProgress so the UI can render a progress bar.
 * If the server accepts the upload but AI inference fails, the result is still returned
 * with status=FAILED — the hook surfaces this for the UI to show an appropriate message.
 */

import { useState, useCallback, useRef } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import apiClient from '@lib/apiClient';
import {
  processCapture,
  processPickerAsset,
  buildUploadFormData,
  ProcessedImage,
  ImageResolutionError,
  ImageFormatError,
} from '@lib/camera/imageUtils';

export type CaptureSource = 'camera' | 'gallery';

export type UploadState =
  | { phase: 'idle' }
  | { phase: 'selecting' }
  | { phase: 'processing' }            // EXIF strip + validation
  | { phase: 'uploading'; progress: number }  // 0–100
  | { phase: 'success'; resultId: string; status: string; aiFindings: Record<string, number> | null }
  | { phase: 'error'; message: string };

export interface UseImageRetakeReturn {
  state: UploadState;
  capturedImage: ProcessedImage | null;
  selectAndUpload: (source: CaptureSource, specimenId: string) => Promise<void>;
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

  // ── Main entry point: pick source → process → upload ─────────────────────

  const selectAndUpload = useCallback(
    async (source: CaptureSource, specimenId: string) => {
      setState({ phase: 'selecting' });

      try {
        // ── 1. Acquire raw asset ─────────────────────────────────────────
        const raw = await _acquireAsset(source);
        if (!raw) {
          setState({ phase: 'idle' }); // user cancelled
          return;
        }

        // ── 2. Process (EXIF strip + resolution check) ───────────────────
        setState({ phase: 'processing' });
        let processed: ProcessedImage;

        if (source === 'camera') {
          processed = await processCapture(raw as any);
        } else {
          processed = await processPickerAsset(raw as any);
        }

        setCapturedImage(processed);

        // ── 3. Upload with progress ──────────────────────────────────────
        setState({ phase: 'uploading', progress: 0 });
        abortRef.current = new AbortController();

        const form = buildUploadFormData(processed, specimenId);

        const response = await apiClient.post('/images/upload', form, {
          // Setting Content-Type to undefined clears the global application/json
          // default and lets React Native XHR set multipart/form-data with the
          // correct boundary automatically. Explicitly setting it without a
          // boundary causes python-multipart to reject the body (422).
          headers: { 'Content-Type': undefined },
          signal: abortRef.current.signal,
          onUploadProgress: (evt) => {
            if (evt.total && evt.total > 0) {
              const progress = Math.round((evt.loaded / evt.total) * 100);
              setState({ phase: 'uploading', progress });
            }
          },
        });

        const { id, status, ai_findings } = response.data;

        setState({
          phase: 'success',
          resultId: id,
          status,
          aiFindings: ai_findings ?? null,
        });
      } catch (err: unknown) {
        if (_isAbortError(err)) return; // unmounted — silently stop

        const message = _extractMessage(err);
        setState({ phase: 'error', message });
      }
    },
    [],
  );

  // ── Discard + retake flow ─────────────────────────────────────────────────

  const discardImage = useCallback(async (imageId: string) => {
    try {
      await apiClient.post(`/images/${imageId}/discard`);
      // Reset to idle so the capture screen re-opens
      reset();
    } catch (err: unknown) {
      const message = _extractMessage(err);
      setState({ phase: 'error', message });
    }
  }, [reset]);

  return { state, capturedImage, selectAndUpload, discardImage, reset };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function _acquireAsset(source: CaptureSource) {
  if (source === 'camera') {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Camera permission is required to capture images. Please enable it in Settings.');
    }
    // The actual capture is handled by the ImageCaptureScreen component using
    // expo-camera's ref.takePictureAsync(). This hook receives the result via
    // selectAndUpload('camera', specimenId) after the screen passes the asset.
    // For gallery, we call ImagePicker directly:
    return null; // camera path is driven by the component
  }

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

  if (result.canceled || !result.assets[0]) return null;
  return result.assets[0];
}

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
    // Axios wraps server 422/400 errors
    const axiosData = (err as any).response?.data;
    if (axiosData?.error?.message) return axiosData.error.message;
    return err.message;
  }
  return 'An unexpected error occurred. Please try again.';
}