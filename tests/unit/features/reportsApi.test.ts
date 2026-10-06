import apiClient from '@lib/apiClient';

import { reportsApi } from '@features/reports/api/reportsApi';

jest.mock('@lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const getMock = apiClient.get as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('reportsApi.getHistory', () => {
  it('requests the category and page, and returns the response body', async () => {
    const body = {
      items: [
        {
          specimenId: 'spec-1',
          resultId: 'res-1',
          sampleUid: 'S-001',
          patientUid: 'P-001',
          testType: 'URINALYSIS',
          priorityLevel: 'ROUTINE',
          receivedAt: '2026-01-01T00:00:00Z',
          category: 'RELEASED',
          finalizedAt: '2026-01-02T00:00:00Z',
          rejectionReason: null,
        },
      ],
      total: 41,
      page: 2,
      pageSize: 20,
    };
    getMock.mockResolvedValue({ data: body });

    const result = await reportsApi.getHistory('RELEASED', 2);

    expect(getMock).toHaveBeenCalledWith('/results/medtech/history', {
      params: { category: 'RELEASED', page: 2 },
      signal: undefined,
    });
    expect(result).toEqual(body);
  });
});
