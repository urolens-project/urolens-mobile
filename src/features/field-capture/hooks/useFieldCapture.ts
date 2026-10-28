import { buildFieldUploadFormData } from '@lib/camera/imageUtils';
import type { ProcessedImage } from '@lib/camera/imageUtils';
import { uploadFieldViaXhr } from '@lib/camera/uploadField';
import { useAsyncAction } from '@hooks/useAsyncAction';

import { saveUploadedField } from '../lib/saveUploadedField';
import type { CapturedField, Magnification } from '../types';

export interface UseFieldCaptureResult {
  /** Uploads a captured field and persists it locally, returning it for FieldResultScreen. */
  captureField: (
    specimenId: string,
    image: ProcessedImage,
    magnification: Magnification,
    onProgress: (progress: number) => void,
  ) => Promise<CapturedField | undefined>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * @description Uploads one captured field (POST /fields) and saves the response into
 * WatermelonDB. Online only: the capture session blocks this call while offline (see
 * ImageCaptureScreen), matching today's single-image upload behavior.
 */
export function useFieldCapture(): UseFieldCaptureResult {
  const { run, isLoading, error } = useAsyncAction(
    'FieldCapture',
    async (
      signal: AbortSignal,
      specimenId: string,
      image: ProcessedImage,
      magnification: Magnification,
      onProgress: (progress: number) => void,
    ): Promise<CapturedField> => {
      const form = await buildFieldUploadFormData(image, specimenId, magnification);
      const data = await uploadFieldViaXhr(form, signal, onProgress);
      return saveUploadedField(specimenId, image.uri, data);
    },
  );

  return { captureField: run, isLoading, error };
}
