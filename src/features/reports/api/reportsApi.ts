import type { components } from '@app-types/api';
import apiClient from '@lib/apiClient';

import type { HistoryReportCategory } from '../types';

type MedtechHistoryListResponseDto = components['schemas']['MedtechHistoryListResponse'];

export const reportsApi = {
  /**
   * @description Fetches one page of the MedTech's sample history for a category, newest
   * first — including samples older than the phone's 30-day sync window.
   * @param category - Which Reports category to list.
   * @param page - 1-based page number.
   * @param signal - Aborts the request when the caller no longer needs the result.
   */
  async getHistory(
    category: HistoryReportCategory,
    page: number,
    signal?: AbortSignal,
  ): Promise<MedtechHistoryListResponseDto> {
    const response = await apiClient.get<MedtechHistoryListResponseDto>(
      '/results/medtech/history',
      { params: { category, page }, signal },
    );
    return response.data;
  },
};
