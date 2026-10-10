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
import type { UploadBatchImageResponse } from '../../src/lib/camera/uploadImage';

function baseResponse(overrides: Partial<UploadBatchImageResponse> = {}): UploadBatchImageResponse {
  return {
    id: 'srv-result-1',
    resultId: 'srv-result-1',
    specimenId: 'srv-spec-1',
    imageIds: ['srv-image-1', 'srv-image-2'],
    primaryImageId: 'srv-image-1',
    imageCount: 2,
    status: 'PENDING_CONFIRM' as UploadBatchImageResponse['status'],
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

  it('persists the primary image id and the full batch image-id set on create', async () => {
    const created = mockNoExistingResult();

    await saveUploadedResult('local-spec-1', baseResponse());

    expect(created[0]).toEqual(
      expect.objectContaining({
        imageId: 'srv-image-1',
        imageIdsJson: JSON.stringify(['srv-image-1', 'srv-image-2']),
      }),
    );
  });

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

  it('replaces the stored image-id set on an update (retake with a different batch)', async () => {
    const updateMock = jest.fn(async (fn: (r: Record<string, unknown>) => void) => {
      fn(existingRecord);
    });
    const existingRecord: Record<string, unknown> = {
      serverId: 'old-srv-result',
      imageId: 'old-image',
      imageIdsJson: JSON.stringify(['old-image']),
      update: updateMock,
    };
    (database.write as jest.Mock).mockImplementation(async (fn: () => Promise<void>) => fn());
    (database.get as jest.Mock).mockImplementation((table: string) => {
      if (table === 'analysis_results') {
        return { query: () => ({ fetch: async () => [existingRecord] }) };
      }
      return { query: () => ({ fetch: async () => [] }) }; // manual_overrides
    });

    await saveUploadedResult(
      'local-spec-1',
      baseResponse({ primaryImageId: 'new-image-1', imageIds: ['new-image-1', 'new-image-2'] }),
    );

    expect(existingRecord['imageId']).toBe('new-image-1');
    expect(existingRecord['imageIdsJson']).toBe(JSON.stringify(['new-image-1', 'new-image-2']));
  });
});
