import { apiClient } from '@lib/apiClient';

import type { FieldActionResponseDto } from '../types';

/**
 * @description Field-lifecycle calls for the multi-field capture workflow.
 * Capture itself (POST /fields) is a multipart upload and goes through
 * `uploadFieldViaXhr` (@lib/camera/uploadField), not this module — see that
 * file's header for why image uploads bypass apiClient.
 */
export const fieldCaptureApi = {
  /**
   * @description Proceed: moves a field from ANALYZED to ACCEPTED.
   * @param fieldId - Server id of the field.
   * @param signal - Aborts the request if the screen unmounts mid-flight.
   */
  accept(fieldId: string, signal?: AbortSignal): Promise<FieldActionResponseDto> {
    return apiClient
      .post<FieldActionResponseDto>(`/fields/${fieldId}/accept`, undefined, { signal })
      .then((res) => res.data);
  },

  /**
   * @description Discard: drops a field, optionally with a reason.
   * @param fieldId - Server id of the field.
   * @param reason - Optional on the mobile path.
   * @param signal - Aborts the request if the screen unmounts mid-flight.
   */
  discard(fieldId: string, reason?: string, signal?: AbortSignal): Promise<FieldActionResponseDto> {
    return apiClient
      .post<FieldActionResponseDto>(`/fields/${fieldId}/discard`, reason ? { reason } : undefined, {
        signal,
      })
      .then((res) => res.data);
  },
};
