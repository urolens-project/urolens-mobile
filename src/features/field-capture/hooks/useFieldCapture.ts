import { buildFieldUploadFormData } from '@lib/camera/imageUtils';
import type { ProcessedImage } from '@lib/camera/imageUtils';
import { isRetakeNeededError, uploadFieldViaXhr } from '@lib/camera/uploadField';
import { useAsyncAction } from '@hooks/useAsyncAction';

import { FIELD_CAPTURE_TEXT } from '../constants/fieldCaptureText.constant';
import { saveUploadedField } from '../lib/saveUploadedField';
import type { CapturedField, Magnification } from '../types';

export type CaptureFieldOutcome =
  | { status: 'success'; field: CapturedField }
  /** The engine's input gate refused the photo outright (not a microscopy image,
   * or badly exposed) — retaking the same image will fail the same way again. */
  | { status: 'retake'; message: string }
  | { status: 'failed'; message: string };

export interface UseFieldCaptureResult {
  /** Uploads a captured field and persists it locally, returning it for FieldResultScreen. */
  captureField: (
    specimenId: string,
    image: ProcessedImage,
    magnification: Magnification,
    onProgress: (progress: number) => void,
  ) => Promise<CaptureFieldOutcome | undefined>;
  isLoading: boolean;
}

/**
 * @description Uploads one captured field (POST /fields) and saves the response into
 * WatermelonDB. Online only: the capture session blocks this call while offline (see
 * ImageCaptureScreen), matching today's single-image upload behavior. Classifies the
 * failure (retake-needed vs. a real analysis failure) in the resolved outcome rather
 * than through this hook's error state, which would still read stale on the very
 * render where the caller needs it.
 */
export function useFieldCapture(): UseFieldCaptureResult {
  const { run, isLoading } = useAsyncAction(
    'FieldCapture',
    async (
      signal: AbortSignal,
      specimenId: string,
      image: ProcessedImage,
      magnification: Magnification,
      onProgress: (progress: number) => void,
    ): Promise<CaptureFieldOutcome> => {
      try {
        const form = await buildFieldUploadFormData(image, specimenId, magnification);
        const data = await uploadFieldViaXhr(form, signal, onProgress);
        const field = await saveUploadedField(specimenId, image.uri, data);
        return { status: 'success', field };
      } catch (err) {
        // A genuine cancellation (unmount, account change) isn't a capture failure —
        // let useAsyncAction's own abort handling take over instead of reporting it.
        if (signal.aborted) throw err;

        if (isRetakeNeededError(err)) {
          return { status: 'retake', message: err.message };
        }
        const message =
          err instanceof Error && err.message
            ? err.message
            : FIELD_CAPTURE_TEXT.uploadFailedFallbackMessage;
        return { status: 'failed', message };
      }
    },
  );

  return { captureField: run, isLoading };
}
