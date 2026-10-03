// src/lib/camera/imageUtils.ts
/**
 * Image utilities for T2.7 — Image Capture & Validation.
 *
 * Responsibilities:
 *  - Strip EXIF metadata from images before upload (privacy requirement).
 *  - Validate resolution meets the AI engine's 640×480 minimum.
 *  - Keep the upload under the server's 10 MB limit: scale large photos down and
 *    always save as JPEG (UROLENS-220).
 *  - Build the multipart FormData for the upload API.
 *
 * Expo's ImageManipulator re-encodes the image without EXIF.
 * We treat the manipulated result as the canonical upload payload.
 */

import { Platform } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import type { ImageManipulatorContext, ImageRef } from 'expo-image-manipulator';
import { ImagePickerAsset } from 'expo-image-picker';
import { CameraCapturedPicture } from 'expo-camera';

export const MIN_WIDTH = 640;
export const MIN_HEIGHT = 480;

// Longest side of an uploaded image. Phone cameras and gallery photos are far
// larger than the AI engine needs (it scales to about 640 px), and full-size files
// can pass the server's limit.
export const MAX_LONG_EDGE = 2048;
// The server refuses anything larger (413 IMAGE_TOO_LARGE).
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const JPEG_QUALITY = 0.92;

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

export class ImageTooLargeError extends Error {
  constructor() {
    super(
      'This image is too large to upload (the limit is 10 MB). ' +
        'Please retake the photo or choose a smaller image.',
    );
    this.name = 'ImageTooLargeError';
  }
}

export class ImageFormatError extends Error {
  constructor(mimeType: string) {
    super(`Unsupported image format "${mimeType}". ` + `Please capture a JPEG or PNG image.`);
    this.name = 'ImageFormatError';
  }
}

/**
 * @description True for the failures a MedTech can fix by choosing another photo
 * (too small, too large, unreadable format). Their messages are written to be shown
 * as-is; anything else is an unexpected error and gets a generic message.
 * @param err - Caught value from processing an image.
 */
export function isImageValidationError(err: unknown): err is Error {
  return (
    err instanceof ImageResolutionError ||
    err instanceof ImageTooLargeError ||
    err instanceof ImageFormatError
  );
}

/**
 * @description Strips EXIF metadata and validates the image from expo-camera.
 * expo-camera returns a CameraCapturedPicture with a local URI; ImageManipulator
 * re-encodes it into a new URI with no EXIF.
 * @param picture - Raw capture from expo-camera.
 */
export async function processCapture(picture: CameraCapturedPicture): Promise<ProcessedImage> {
  return processUri(picture.uri, 'captured');
}

/**
 * @description Strips EXIF metadata and validates the image from expo-image-picker.
 * @param asset - Picked gallery asset.
 */
export async function processPickerAsset(asset: ImagePickerAsset): Promise<ProcessedImage> {
  if (!asset.uri) throw new ImageFormatError('unknown');
  return processUri(asset.uri, asset.fileName ?? 'gallery-image');
}

/**
 * @description Builds a FormData object ready for the multipart POST /images/upload.
 * Native's FormData polyfill accepts a { uri, name, type } object literal as a file
 * part, but a real browser FormData does not — it just stringifies unknown objects.
 * On web the local URI has to be resolved to an actual Blob first and appended as a File.
 * @param image - Processed image to upload.
 * @param specimenId - Specimen the image belongs to.
 */
export async function buildUploadFormData(
  image: ProcessedImage,
  specimenId: string,
): Promise<FormData> {
  const form = new FormData();
  // Backend's POST /images/upload multipart field is snake_case (src/api/image.py),
  // the one deviation from camelCase in the whole API. This has flip-flopped across
  // several commits already — tests/unit/imageUtils.test.ts pins the correct name.
  form.append('specimen_id', specimenId);

  if (Platform.OS === 'web') {
    const blob = await fetch(image.uri).then((r) => r.blob());
    form.append('file', new File([blob], image.filename, { type: image.mimeType }));
  } else {
    form.append('file', {
      uri: image.uri,
      name: image.filename,
      type: image.mimeType,
    } as unknown as Blob);
  }

  return form;
}

// ── Private helpers ───────────────────────────────────────────────────────────

async function processUri(uri: string, filenameStem: string): Promise<ProcessedImage> {
  // Re-encode via the chain API — strips all EXIF.
  const context = ImageManipulator.manipulate(uri);
  const original = await context.renderAsync();

  // Resolution validation (mirrors backend check), on the photo as taken.
  if (original.width < MIN_WIDTH || original.height < MIN_HEIGHT) {
    throw new ImageResolutionError(original.width, original.height);
  }

  const imageRef = await scaleDown(context, original);

  // Always JPEG: a PNG of a photo this size can still pass the server's limit.
  const saved = await imageRef.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });

  const sizeBytes = await readSizeBytes(saved.uri);
  if (sizeBytes > MAX_UPLOAD_BYTES) throw new ImageTooLargeError();

  return {
    uri: saved.uri,
    width: imageRef.width,
    height: imageRef.height,
    mimeType: 'image/jpeg',
    sizeBytes,
    filename: `${filenameStem}-${Date.now()}.jpg`,
  };
}

// Scales the image so its longest side is MAX_LONG_EDGE, keeping its shape. An image
// already within the limit is returned as rendered — it is never scaled up.
async function scaleDown(context: ImageManipulatorContext, original: ImageRef): Promise<ImageRef> {
  if (Math.max(original.width, original.height) <= MAX_LONG_EDGE) return original;
  const isLandscape = original.width >= original.height;
  return context
    .resize(isLandscape ? { width: MAX_LONG_EDGE } : { height: MAX_LONG_EDGE })
    .renderAsync();
}

// File size after processing. 0 when it can't be read: the preview then shows no
// size, and the server's own limit still applies.
async function readSizeBytes(uri: string): Promise<number> {
  try {
    const blob = await fetch(uri).then((r) => r.blob());
    return blob.size;
  } catch {
    return 0;
  }
}
