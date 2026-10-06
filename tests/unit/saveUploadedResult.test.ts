/**
 * Unit tests for saveUploadedResult — in particular that smartDiagnosisUnavailable is
 * read from the upload response instead of hardcoded false (UROLENS-229).
 */

jest.mock('@nozbe/watermelondb', () => ({
  Q: { where: jest.fn((field: string, value: unknown) => ({ _type: 'where', field, value })) },
}));

jest.mock('@db/database', () => ({ database: { write: jest.fn(), get: jest.fn() } }));

import { saveUploadedResult } from '../../src/features/image-retake/lib/saveUploadedResult';
import { database } from '../../src/db/database';
import type { UploadImageResponse } from '../../src/lib/camera/uploadImage';

function baseResponse(overrides: Partial<UploadImageResponse> = {}): UploadImageResponse {
  return {
    id: 'srv-result-1',
    resultId: 'srv-result-1',
    specimenId: 'srv-spec-1',
    imageId: 'srv-image-1',
    status: 'PENDING_CONFIRM' as UploadImageResponse['status'],
    aiFindings: { RBC: 3 },
    flaggedAnomalies: null,
    smartDiagnosis: null,
    smartDiagnosisUnavailable: false,
    ...overrides,
  };
}

function mockNoExistingResult(): Record<string, unknown>[] {
  const created: Record<string, unknown>[] = [];
  (database.write as jest.Mock).mockImplementation(async (fn: () => Promise<void>) => fn());
  (database.get as jest.Mock).mockImplementation((table: string) => {
    if (table === 'analysis_results') {
      return {
        query: () => ({ fetch: async () => [] }),
        create: jest.fn(async (builder: (r: Record<string, unknown>) => void) => {
          const model: Record<string, unknown> = {};
          builder(model);
          created.push(model);
          return model;
        }),
      };
    }
    return { query: () => ({ fetch: async () => [] }) };
  });
  return created;
}

describe('saveUploadedResult', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([true, false])(
    'creates a new result with smartDiagnosisUnavailable=%s from the response',
    async (smartDiagnosisUnavailable) => {
      const created = mockNoExistingResult();

      await saveUploadedResult('local-spec-1', baseResponse({ smartDiagnosisUnavailable }));

      expect(created[0]).toEqual(expect.objectContaining({ smartDiagnosisUnavailable }));
    },
  );

  it('updates an existing result with smartDiagnosisUnavailable from the response (retake)', async () => {
    const updateMock = jest.fn(async (fn: (r: Record<string, unknown>) => void) => {
      fn(existingRecord);
    });
    const existingRecord: Record<string, unknown> = {
      serverId: 'old-srv-result',
      update: updateMock,
    };
    (database.write as jest.Mock).mockImplementation(async (fn: () => Promise<void>) => fn());
    (database.get as jest.Mock).mockImplementation((table: string) => {
      if (table === 'analysis_results') {
        return { query: () => ({ fetch: async () => [existingRecord] }) };
      }
      return { query: () => ({ fetch: async () => [] }) }; // manual_overrides
    });

    await saveUploadedResult('local-spec-1', baseResponse({ smartDiagnosisUnavailable: true }));

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(existingRecord['smartDiagnosisUnavailable']).toBe(true);
  });
});
