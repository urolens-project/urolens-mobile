import { apiClient } from '@lib/apiClient';
import type { components } from '@app-types/api';

type ResultDetailDto = components['schemas']['FullResultDetail'];

export const resultReviewApi = {
  /**
   * @description Loads the image, patient identifiers and AI findings for review.
   * @param resultId - Server result identifier.
   * @param signal - Cancels a superseded request.
   */
  async getDetail(resultId: string, signal?: AbortSignal): Promise<ResultDetailDto> {
    const response = await apiClient.get<ResultDetailDto>(`/results/${resultId}`, { signal });
    return response.data;
  },
};
