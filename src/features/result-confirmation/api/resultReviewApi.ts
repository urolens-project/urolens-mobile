import { apiClient } from '@lib/apiClient';
import type { components } from '@app-types/api';

type ResultDetailDto = components['schemas']['FullResultDetail'];
type AnnotationRequestDto = components['schemas']['AnnotationRequest'];
type AnnotationResponseDto = components['schemas']['AnnotationResponse'];

export const resultReviewApi = {
  /**
   * @description Loads the image, patient identifiers and attributed corrections for review.
   * @param resultId - Server result identifier.
   * @param signal - Cancels a superseded request.
   */
  async getDetail(resultId: string, signal?: AbortSignal): Promise<ResultDetailDto> {
    const response = await apiClient.get<ResultDetailDto>(`/results/${resultId}`, { signal });
    return response.data;
  },

  /**
   * @description Replaces only the signed-in reviewer's annotation before submission.
   * @param resultId - Server result identifier.
   * @param payload - Notes and the complete list of image boxes, including deletions.
   * @param signal - Cancels a superseded request.
   */
  async saveAnnotations(
    resultId: string,
    payload: AnnotationRequestDto,
    signal?: AbortSignal,
  ): Promise<AnnotationResponseDto> {
    const response = await apiClient.patch<AnnotationResponseDto>(
      `/results/${resultId}/annotate`,
      payload,
      { signal },
    );
    return response.data;
  },
};
