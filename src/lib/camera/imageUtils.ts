// src/lib/camera/imageUtils.ts
/**
 * Image utilities for T2.7 — Image Capture & Validation.
 *
 * Responsibilities:
 *  - Strip EXIF metadata from images before upload (privacy requirement).
 *  - Validate resolution meets the AI engine's 640×480 minimum.
 *  - Build the multipart FormData for the upload API.
 *
 * Expo's ImageManipulator re-encodes the image without EXIF.
 * We treat the manipulated result as the canonical upload payload.
 */

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { ImagePickerAsset } from 'expo-image-picker';
import { CameraCapturedPicture } from 'expo-camera';

export const MIN_WIDTH = 640;
export const MIN_HEIGHT = 480;

export type SupportedMimeType = 'image/jpeg' | 'image/png';

export interface ProcessedImage {
  /** Local file URI after EXIF strip (safe to upload) */
  uri: string;
  width: number;
  height: number;
  mimeType: SupportedMimeType;
  /** Size in bytes — read after processing */
  sizeBytes: number;
  /** Original filename hint (optional) */
  filename: string;
}

export class ImageResolutionError extends Error {
  constructor(width: number, height: number) {
    super(
      `Image resolution ${width}×${height} is below the minimum ` +
        `${MIN_WIDTH}×${MIN_HEIGHT} required for AI analysis. ` +
        `Please retake the photo closer to the microscope eyepiece.`,
    );
    this.name = 'ImageResolutionError';
  }
}

export class ImageFormatError extends Error {
  constructor(mimeType: string) {
    super(
      `Unsupported image format "${mimeType}". ` +
        `Please capture a JPEG or PNG image.`,
    );
    this.name = 'ImageFormatError';
  }
}

/**
 * Strip EXIF metadata and validate the image from expo-camera.
 *
 * expo-camera returns a CameraCapturedPicture with a local URI.
 * ImageManipulator re-encodes → new URI with no EXIF.
 */
export async function processCapture(
  picture: CameraCapturedPicture,
): Promise<ProcessedImage> {
  return _processUri(picture.uri, 'captured');
}

/**
 * Strip EXIF metadata and validate the image from expo-image-picker.
 */
export async function processPickerAsset(
  asset: ImagePickerAsset,
): Promise<ProcessedImage> {
  if (!asset.uri) throw new ImageFormatError('unknown');
  return _processUri(
    asset.uri,
    asset.fileName ?? 'gallery-image',
    asset.mimeType as SupportedMimeType | undefined,
  );
}

/**
 * Build a FormData object ready for the multipart POST /images/upload.
 */
export function buildUploadFormData(
  image: ProcessedImage,
  specimenId: string,
): FormData {
  const form = new FormData();
  form.append('specimen_id', specimenId);
  // React Native's FormData accepts an object literal for file parts
  form.append('file', {
    uri: image.uri,
    name: image.filename,
    type: image.mimeType,
  } as unknown as Blob);
  return form;
}

// ── Private helpers ───────────────────────────────────────────────────────────

async function _processUri(
  uri: string,
  filenameStem: string,
  mimeType?: SupportedMimeType,
): Promise<ProcessedImage> {
  // Default to JPEG — Expo Camera always produces JPEG
  const outputMime: SupportedMimeType = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
  const format = outputMime === 'image/png' ? SaveFormat.PNG : SaveFormat.JPEG;

  // Re-encode via new chain API — strips all EXIF, no resize.
  const imageRef = await ImageManipulator.manipulate(uri).renderAsync();
  const { width, height } = imageRef;

  // Resolution validation (mirrors backend check)
  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    throw new ImageResolutionError(width, height);
  }

  const saved = await imageRef.saveAsync({ compress: 0.92, format });

  // Approximate file size via fetch blob — non-critical, used for UI only
  let sizeBytes = 0;
  try {
    const blob = await fetch(saved.uri).then((r) => r.blob());
    sizeBytes = blob.size;
  } catch {
    // ignore — size is not required for upload
  }

  return {
    uri: saved.uri,
    width,
    height,
    mimeType: outputMime,
    sizeBytes,
    filename: `${filenameStem}-${Date.now()}.${format === SaveFormat.PNG ? 'png' : 'jpg'}`,
  };
}