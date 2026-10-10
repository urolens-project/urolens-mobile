// src/features/image-retake/hooks/useBatchCapture.ts
/**
 * useBatchCapture — multi-image specimen capture & upload.
 *
 * Replaces the old single-shot useImageRetake (dead code — ImageCaptureScreen used
 * to carry its own duplicate inline state machine instead). A specimen capture
 * session is a burst of `targetCount` fields of view (10-30), each going through
 * the same capture → preview → keep/retake step before the whole set uploads
 * together in one request. The camera opens immediately at DEFAULT_BATCH_IMAGES —
 * there's no separate "how many?" screen; the count is a live HUD control the
 * MedTech can nudge up/down mid-session (`adjustTargetCount`), bounded below by
 * what's already been kept (can't shrink past shots already taken) and above by
 * MAX_BATCH_IMAGES.
 *
 * Phases:
 *   capturing     → (captureFromCamera/pickFromGalleryForSlot) → previewing
 *   previewing    → (keepPending)    → capturing (slot not full yet) | reviewing (full)
 *   previewing    → (retakePending)  → capturing (same slot) — gated by a discard
 *                                       confirmation the first time an existing
 *                                       uploaded batch is being replaced
 *   reviewing     → (retakeSlot)     → capturing (that slot) → previewing → reviewing
 *   reviewing     → (adjustTargetCount, +1 or more) → capturing (take more)
 *   reviewing     → (uploadBatch)    → uploading
 */

import { useCallback, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import type { CameraCapturedPicture } from 'expo-camera';

import apiClient from '@lib/apiClient';
import {
  processCapture,
  processPickerAsset,
  buildBatchUploadFormData,
  isImageValidationError,
  DEFAULT_BATCH_IMAGES,
  MIN_BATCH_IMAGES,
  MAX_BATCH_IMAGES,
} from '@lib/camera/imageUtils';
import type { ProcessedImage } from '@lib/camera/imageUtils';
import { uploadImageBatchViaXhr } from '@lib/camera/uploadImage';
import type { UploadBatchImageResponse } from '@lib/camera/uploadImage';

export type BatchCapturePhase = 'capturing' | 'previewing' | 'reviewing' | 'uploading';

export interface UseBatchCaptureReturn {
  phase: BatchCapturePhase;
  targetCount: number;
  capturedImages: ProcessedImage[];
  /** 0-based slot the next capture/retake fills — the slot shown while capturing/previewing. */
  activeSlotIndex: number;
  /** True when activeSlotIndex points at an already-committed slot being redone from the grid. */
  isRetakingSlot: boolean;
  pendingCapture: ProcessedImage | null;
  uploadProgress: number;
  validationError: string | null;
  showDiscardModal: boolean;
  isDiscarding: boolean;
  /** Whether targetCount can currently move down/up a step — drives the HUD stepper's disabled state. */
  canDecreaseTarget: boolean;
  canIncreaseTarget: boolean;
  /** Nudges targetCount by delta (±1), clamped to [max(MIN_BATCH_IMAGES, capturedImages.length), MAX_BATCH_IMAGES]. */
  adjustTargetCount: (delta: number) => void;
  captureFromCamera: (
    takePicture: () => Promise<CameraCapturedPicture | undefined>,
  ) => Promise<void>;
  pickFromGalleryForSlot: () => Promise<void>;
  keepPending: () => void;
  retakePending: () => void;
  retakeSlot: (index: number) => void;
  confirmDiscardExisting: () => Promise<void>;
  cancelDiscardModal: () => void;
  /** Throws on failure so the caller can show its own alert. */
  uploadBatch: (specimenId: string) => Promise<UploadBatchImageResponse>;
  reset: () => void;
}

/**
 * @description Drives a multi-image specimen capture session: capturing/previewing
 * each field of view with a per-slot retake, a live-adjustable target count
 * (10-30), reviewing the full set, and uploading it as a single batch.
 * @param existingImageIds - Image ids from a previously uploaded batch, if this
 * session is replacing one (retake). The first retake of a pending capture
 * discards all of them before the camera reopens.
 */
export function useBatchCapture(existingImageIds: string[] = []): UseBatchCaptureReturn {
  const [phase, setPhase] = useState<BatchCapturePhase>('capturing');
  const [targetCount, setTargetCount] = useState(DEFAULT_BATCH_IMAGES);
  const [capturedImages, setCapturedImages] = useState<ProcessedImage[]>([]);
  const [retakeSlotIndex, setRetakeSlotIndex] = useState<number | null>(null);
  const [pendingCapture, setPendingCapture] = useState<ProcessedImage | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [existingDiscarded, setExistingDiscarded] = useState(existingImageIds.length === 0);

  const activeSlotIndex = retakeSlotIndex ?? capturedImages.length;
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback((): void => {
    abortRef.current?.abort();
    setPhase('capturing');
    setTargetCount(DEFAULT_BATCH_IMAGES);
    setCapturedImages([]);
    setRetakeSlotIndex(null);
    setPendingCapture(null);
    setUploadProgress(0);
    setValidationError(null);
    setShowDiscardModal(false);
  }, []);

  // Can't shrink past shots already kept — MIN_BATCH_IMAGES is a floor on top of that.
  const targetFloor = Math.max(MIN_BATCH_IMAGES, capturedImages.length);
  const canDecreaseTarget = targetCount > targetFloor;
  const canIncreaseTarget = targetCount < MAX_BATCH_IMAGES;

  const adjustTargetCount = useCallback(
    (delta: number): void => {
      const next = Math.min(MAX_BATCH_IMAGES, Math.max(targetFloor, targetCount + delta));
      if (next === targetCount) return;
      setTargetCount(next);

      // Only auto-switch between the two "idle between shots" phases — never
      // interrupt an in-progress preview/upload, and never fight a grid retake.
      if (phase === 'capturing' && capturedImages.length >= next) {
        setPhase('reviewing');
      } else if (phase === 'reviewing' && capturedImages.length < next) {
        setPhase('capturing');
      }
    },
    [targetCount, targetFloor, phase, capturedImages.length],
  );

  const captureFromCamera = useCallback(
    async (takePicture: () => Promise<CameraCapturedPicture | undefined>): Promise<void> => {
      setValidationError(null);
      try {
        const picture = await takePicture();
        if (!picture) return;
        const processed = await processCapture(picture);
        setPendingCapture(processed);
        setPhase('previewing');
      } catch (err: unknown) {
        setValidationError(
          isImageValidationError(err) ? err.message : 'Failed to capture image. Please try again.',
        );
      }
    },
    [],
  );

  const pickFromGalleryForSlot = useCallback(async (): Promise<void> => {
    setValidationError(null);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        setValidationError(
          'UroLens could not access your photo library. Allow Photos access in Settings, or take a photo instead.',
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

      const processed = await processPickerAsset(result.assets[0]);
      setPendingCapture(processed);
      setPhase('previewing');
    } catch (err: unknown) {
      setValidationError(
        isImageValidationError(err)
          ? err.message
          : 'Could not process the selected image. Please try another.',
      );
    }
  }, []);

  const keepPending = useCallback((): void => {
    if (!pendingCapture) return;

    const wasRetake = retakeSlotIndex !== null;
    const nextImages = [...capturedImages];
    if (wasRetake) {
      nextImages[retakeSlotIndex as number] = pendingCapture;
    } else {
      nextImages.push(pendingCapture);
    }

    setCapturedImages(nextImages);
    setPendingCapture(null);
    setRetakeSlotIndex(null);
    setPhase(wasRetake || nextImages.length >= targetCount ? 'reviewing' : 'capturing');
  }, [pendingCapture, retakeSlotIndex, capturedImages, targetCount]);

  const retakePending = useCallback((): void => {
    if (!existingDiscarded) {
      setShowDiscardModal(true);
      return;
    }
    setPendingCapture(null);
    setValidationError(null);
    setPhase('capturing');
  }, [existingDiscarded]);

  const retakeSlot = useCallback((index: number): void => {
    setRetakeSlotIndex(index);
    setPendingCapture(null);
    setValidationError(null);
    setPhase('capturing');
  }, []);

  const confirmDiscardExisting = useCallback(async (): Promise<void> => {
    setIsDiscarding(true);
    try {
      await Promise.all(existingImageIds.map((id) => apiClient.post(`/images/${id}/discard`)));
      setExistingDiscarded(true);
      setShowDiscardModal(false);
      setPendingCapture(null);
      setValidationError(null);
      setPhase('capturing');
    } catch {
      setShowDiscardModal(false);
      setValidationError('Could not discard the previous images. Please try again.');
      setPhase('previewing');
    } finally {
      setIsDiscarding(false);
    }
  }, [existingImageIds]);

  const cancelDiscardModal = useCallback((): void => {
    setShowDiscardModal(false);
  }, []);

  const uploadBatch = useCallback(
    async (specimenId: string): Promise<UploadBatchImageResponse> => {
      setPhase('uploading');
      setUploadProgress(0);
      abortRef.current = new AbortController();

      try {
        const form = await buildBatchUploadFormData(capturedImages, specimenId);
        const data = await uploadImageBatchViaXhr(form, abortRef.current.signal, (progress) => {
          setUploadProgress(progress);
        });
        return data;
      } catch (err: unknown) {
        if (!isAbortError(err)) {
          setValidationError(extractMessage(err));
          setPhase('reviewing');
        }
        throw err;
      }
    },
    [capturedImages],
  );

  return {
    phase,
    targetCount,
    capturedImages,
    activeSlotIndex,
    isRetakingSlot: retakeSlotIndex !== null,
    pendingCapture,
    uploadProgress,
    validationError,
    showDiscardModal,
    isDiscarding,
    canDecreaseTarget,
    canIncreaseTarget,
    adjustTargetCount,
    captureFromCamera,
    pickFromGalleryForSlot,
    keepPending,
    retakePending,
    retakeSlot,
    confirmDiscardExisting,
    cancelDiscardModal,
    uploadBatch,
    reset,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === 'AbortError' || err.name === 'CanceledError');
}

function extractMessage(err: unknown): string {
  if (isImageValidationError(err)) {
    return err.message;
  }
  if (err instanceof Error) {
    const axiosData = (err as { response?: { data?: { error?: { message?: string } } } }).response
      ?.data;
    if (axiosData?.error?.message) return axiosData.error.message;
    return err.message;
  }
  return 'An unexpected error occurred. Please try again.';
}
