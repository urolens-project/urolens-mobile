import { apiClient } from '@lib/apiClient';

import type { SpecimenRejectRequest, SpecimenRejectResponse } from '../types';

export const specimenRejectionApi = {
  /**
   * @description Submits a rejection for a specimen assigned to the authenticated MedTech.
   * @param specimenId - Server specimen identifier.
   * @param payload - Selected reason and optional note.
   * @param signal - Cancels the request when the screen unmounts.
   */
  async reject(
    specimenId: string,
    payload: SpecimenRejectRequest,
    signal?: AbortSignal,
  ): Promise<SpecimenRejectResponse> {
    const { data } = await apiClient.post<SpecimenRejectResponse>(
      `/specimens/${specimenId}/reject`,
      payload,
      { signal },
    );
    return data;
  },
};
