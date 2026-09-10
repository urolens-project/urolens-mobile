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
  result_id: string;
  specimen_id: string;
  image_id: string | null;
  status: ResultStatus;
  ai_findings: Record<string, number> | null;
  flagged_anomalies: Record<string, unknown> | null;
  smart_diagnosis: Record<string, unknown> | null;
}

export function uploadImageViaXhr(
  form: FormData,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
): Promise<UploadImageResponse> {
  return new Promise(async (resolve, reject) => {
    const token = await tokenStorage.getToken();
    const baseUrl = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
    const xhr = new XMLHttpRequest();

    const onAbort = () => xhr.abort();
    signal.addEventListener('abort', onAbort);

    xhr.open('POST', `${baseUrl}/images/upload`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = 60000;

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && evt.total > 0) { onProgress(Math.round((evt.loaded / evt.total) * 100)); }
    };

    xhr.onload = () => {
      signal.removeEventListener('abort', onAbort);
      let body: any = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // non-JSON response, fall through to error below
      }
      if (xhr.status >= 200 && xhr.status < 300 && body) {
        resolve(body);
      } else {
        const error = new Error(body?.error?.message ?? `Upload failed with status ${xhr.status}`);
        (error as any).response = { data: body };
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
