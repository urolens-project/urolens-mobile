/**
 * cleanUpFinishedFields: frees a finished (or rejected) specimen's field images and
 * AI boxes from local storage. Deletes the actual file (mobile PR #55 review,
 * decision #4) — documentDirectory/fields/ is never reclaimed by the OS the way the
 * old cache location was, so RA 10173 data minimisation depends on this app doing it.
 */

jest.mock('@db/database', () => ({
  database: { get: jest.fn(), batch: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('@db/sync/fieldFiles', () => ({ deleteFieldImageFile: jest.fn() }));

import { cleanUpFinishedFields } from '../../src/db/sync/fieldCleanup';
import { database } from '../../src/db/database';
import { deleteFieldImageFile } from '../../src/db/sync/fieldFiles';

interface TableState {
  analysis_results?: Record<string, unknown>[];
  specimens?: Record<string, unknown>[];
  result_fields?: Record<string, unknown>[];
  field_detections?: Record<string, unknown>[];
}

function setupDb(state: TableState): void {
  (database.get as jest.Mock).mockImplementation((table: string) => ({
    query: () => ({ fetch: async () => state[table as keyof TableState] ?? [] }),
  }));
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('cleanUpFinishedFields', () => {
  it('does nothing when no result is finished and no specimen is rejected', async () => {
    setupDb({ analysis_results: [], specimens: [] });

    await cleanUpFinishedFields();

    expect(database.batch).not.toHaveBeenCalled();
    expect(deleteFieldImageFile).not.toHaveBeenCalled();
  });

  it("deletes a finished result's field image file and field_detections row", async () => {
    const field = {
      id: 'local-f1',
      localImageUri: 'file:///fields/f1.jpg',
      prepareUpdate: jest.fn((cb: (f: Record<string, unknown>) => void) => {
        cb(field);
        return 'prepared-update';
      }),
    };
    const detection = { prepareDestroyPermanently: jest.fn().mockReturnValue('prepared-destroy') };
    setupDb({
      analysis_results: [{ serverId: 'ar-1', status: 'APPROVED' }],
      specimens: [],
      result_fields: [field],
      field_detections: [detection],
    });

    await cleanUpFinishedFields();

    expect(deleteFieldImageFile).toHaveBeenCalledWith('file:///fields/f1.jpg');
    expect(database.batch).toHaveBeenCalledWith('prepared-update', 'prepared-destroy');
  });

  it("also cleans up a rejected specimen's fields, even with no finished result", async () => {
    const field = {
      id: 'local-f2',
      localImageUri: 'file:///fields/f2.jpg',
      prepareUpdate: jest.fn((cb: (f: Record<string, unknown>) => void) => {
        cb(field);
        return 'prepared-update-2';
      }),
    };
    setupDb({
      analysis_results: [],
      specimens: [{ serverId: 'spec-1', status: 'REJECTED' }],
      result_fields: [field],
      field_detections: [],
    });

    await cleanUpFinishedFields();

    expect(deleteFieldImageFile).toHaveBeenCalledWith('file:///fields/f2.jpg');
    expect(database.batch).toHaveBeenCalledWith('prepared-update-2');
  });

  it('leaves a field with no local image alone', async () => {
    const field = { id: 'local-f3', localImageUri: null, prepareUpdate: jest.fn() };
    setupDb({
      analysis_results: [{ serverId: 'ar-1', status: 'APPROVED' }],
      specimens: [],
      result_fields: [field],
      field_detections: [],
    });

    await cleanUpFinishedFields();

    expect(deleteFieldImageFile).not.toHaveBeenCalled();
    expect(database.batch).not.toHaveBeenCalled();
    expect(field.prepareUpdate).not.toHaveBeenCalled();
  });
});
