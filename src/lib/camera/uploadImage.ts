// src/lib/camera/uploadImage.ts
/**
 * Shared multipart upload helper for POST /images/upload.
 *
 * axios's FormData detection has been unreliable in this Metro/Expo bundle —
 * it was JSON-stringifying the FormData instance instead of sending it as
 * multipart, silently dropping the file (seen on both web and native).
 * Raw XMLHttpRequest sidesteps that: leaving Content-Type unset lets the
 * browser/RN network layer generate the correct multipart boundary itself.
 */
import apiClient from '@lib/apiClient';
import { tokenStorage } from '@lib/auth/tokenStorage';
import { ResultStatus } from '@db/models/AnalysisResult';

export interface UploadImageResponse {
  id: string;
  resultId: string;
  specimenId: string;
  imageId: string | null;
  status: ResultStatus;
  aiFindings: Record<string, number> | null;
  flaggedAnomalies: Record<string, unknown> | null;
  smartDiagnosis: Record<string, unknown> | null;
  smartDiagnosisUnavailable: boolean;
}

/** @description Response shape for POST /images/upload-batch — see the backend contract report. */
export interface UploadBatchImageResponse {
  id: string;
  resultId: string;
  specimenId: string;
  /** Every image id created for this batch, in capture order. */
  imageIds: string[];
  /** Representative image shown where the UI only has room for one (e.g. result review). */
  primaryImageId: string | null;
  imageCount: number;
  status: ResultStatus;
  aiFindings: Record<string, number> | null;
  flaggedAnomalies: Record<string, unknown> | null;
  smartDiagnosis: Record<string, unknown> | null;
  smartDiagnosisUnavailable: boolean;
}

const HTTP_PAYLOAD_TOO_LARGE = 413;

interface UploadErrorBody {
  error?: { message?: string };
}

/** @description An upload failure shaped like an axios error, so callers can read `.response.data` either way. */
export interface UploadXhrError extends Error {
  response?: { data: unknown };
}

/**
 * @description Uploads an image via raw XMLHttpRequest instead of axios/fetch — see
 * the file header for why. Reports progress and supports cancellation via `signal`.
 * @param form - Multipart form built by `buildUploadFormData`.
 * @param signal - Aborts the in-flight request when triggered.
 * @param onProgress - Called with 0-100 as the upload progresses.
 */
export function uploadImageViaXhr(
  form: FormData,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
): Promise<UploadImageResponse> {
  return postMultipartViaXhr<UploadImageResponse>('/images/upload', form, signal, onProgress);
}

/**
 * @description Uploads a full capture-session batch (10-30 fields of view) via the
 * same raw-XHR approach as `uploadImageViaXhr`. One request, one progress stream —
 * the server aggregates AI findings across every file in the `files` field.
 * @param form - Multipart form built by `buildBatchUploadFormData`.
 * @param signal - Aborts the in-flight request when triggered.
 * @param onProgress - Called with 0-100 as the upload progresses.
 */
export function uploadImageBatchViaXhr(
  form: FormData,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
): Promise<UploadBatchImageResponse> {
  return postMultipartViaXhr<UploadBatchImageResponse>(
    '/images/upload-batch',
    form,
    signal,
    onProgress,
  );
}

/**
 * @description Shared raw-XHR multipart POST behind both upload functions — see the
 * file header for why XHR instead of axios/fetch.
 * @param path - API path relative to the configured base URL (e.g. '/images/upload').
 * @param form - Multipart form to send as the request body.
 * @param signal - Aborts the in-flight request when triggered.
 * @param onProgress - Called with 0-100 as the upload progresses.
 */
function postMultipartViaXhr<T>(
  path: string,
  form: FormData,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const token = await tokenStorage.getToken();
    const baseUrl = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
    const xhr = new XMLHttpRequest();

    const onAbort = () => xhr.abort();
    signal.addEventListener('abort', onAbort);

    xhr.open('POST', `${baseUrl}${path}`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = 60000;

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && evt.total > 0) {
        onProgress(Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
      }
    };

    xhr.onload = () => {
      signal.removeEventListener('abort', onAbort);
      let body: (T & UploadErrorBody) | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // non-JSON response, fall through to error below
      }
      if (xhr.status >= 200 && xhr.status < 300 && body) {
        resolve(body);
      } else {
        const error: UploadXhrError = new Error(
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
