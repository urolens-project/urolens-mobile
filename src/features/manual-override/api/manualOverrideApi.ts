import type { components } from '@app-types/api';
import { apiClient } from '@lib/apiClient';

type OverrideRequestDto = components['schemas']['OverrideRequest'];
type OverrideResponseDto = components['schemas']['OverrideResponse'];

export const manualOverrideApi = {
  /**
   * @description Records a correction while letting the server preserve the authoritative AI value and author.
   * @param resultId - Server result identifier.
   * @param payload - Corrected count and rationale.
   * @param signal - Cancels the request when the editor closes.
   */
  async submit(
    resultId: string,
    payload: OverrideRequestDto,
    signal?: AbortSignal,
  ): Promise<OverrideResponseDto> {
    const response = await apiClient.post<OverrideResponseDto>(
      `/results/${resultId}/override`,
      payload,
      { signal },
    );
    return response.data;
  },
};
