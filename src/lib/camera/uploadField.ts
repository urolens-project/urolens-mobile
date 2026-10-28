// src/lib/camera/uploadField.ts
/**
 * Shared multipart upload helper for POST /fields (one captured microscope
 * field, multi-field workflow). Raw XMLHttpRequest for the same reason as
 * uploadImage.ts: axios's FormData detection has been unreliable in this
 * Metro/Expo bundle, silently dropping the file.
 */
import apiClient from '@lib/apiClient';
import { tokenStorage } from '@lib/auth/tokenStorage';

import type { FieldAnalysisResponseDto } from '@features/field-capture/types';

const HTTP_PAYLOAD_TOO_LARGE = 413;

interface UploadErrorBody {
  error?: { message?: string };
}

/** @description An upload failure shaped like an axios error, so callers can read `.response.data` either way. */
export interface UploadFieldXhrError extends Error {
  response?: { data: unknown };
}

/**
 * @description Uploads one captured field via raw XMLHttpRequest — see the file
 * header for why. Reports progress and supports cancellation via `signal`.
 * @param form - Multipart form built by `buildFieldUploadFormData`.
 * @param signal - Aborts the in-flight request when triggered.
 * @param onProgress - Called with 0-100 as the upload progresses.
 */
export function uploadFieldViaXhr(
  form: FormData,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
): Promise<FieldAnalysisResponseDto> {
  return new Promise(async (resolve, reject) => {
    const token = await tokenStorage.getToken();
    const baseUrl = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
    const xhr = new XMLHttpRequest();

    const onAbort = () => xhr.abort();
    signal.addEventListener('abort', onAbort);

    xhr.open('POST', `${baseUrl}/fields`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = 60000;

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && evt.total > 0) {
        onProgress(Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
      }
    };

    xhr.onload = () => {
      signal.removeEventListener('abort', onAbort);
      let body: (FieldAnalysisResponseDto & UploadErrorBody) | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // non-JSON response, fall through to error below
      }
      if (xhr.status >= 200 && xhr.status < 300 && body) {
        resolve(body);
      } else {
        const error: UploadFieldXhrError = new Error(
          body?.error?.message ?? describeUploadStatus(xhr.status),
        );
        error.response = { data: body };
        reject(error);
      }
    };

    xhr.onerror = () => {
      signal.removeEventListener('abort', onAbort);
      reject(new Error('Network error during upload.'));
    };

    xhr.ontimeout = () => {
      signal.removeEventListener('abort', onAbort);
      reject(new Error('Upload timed out. Please check your connection and try again.'));
    };

    xhr.onabort = () => {
      signal.removeEventListener('abort', onAbort);
      const abortErr = new Error('Upload cancelled.');
      abortErr.name = 'AbortError';
      reject(abortErr);
    };

    xhr.send(form);
  });
}

// A refusal with no message of its own, e.g. a proxy answering before the API does.
function describeUploadStatus(status: number): string {
  if (status === HTTP_PAYLOAD_TOO_LARGE) {
    return 'This image is too large to upload (the limit is 10 MB). Please retake the photo.';
  }
  return `Upload failed with status ${status}`;
}
