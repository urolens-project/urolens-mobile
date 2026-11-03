/**
 * fetchRemoteFields — the background fetch of fields captured on another phone
 * (mobile-n8-todo-rem.md C5/M12). Must only ever reach the server for a CAPTURING
 * result's fields that this device doesn't already have boxes or an image for —
 * calling it for PENDING_CONFIRM/RETURNED_FOR_CORRECTION would trigger the backend's
 * "opened" tracking meant for the web verification workspace, not a phone still
 * capturing.
 */

jest.mock('@nozbe/watermelondb', () => ({
  Q: {
    where: jest.fn((field: string, value: unknown) => ({ field, value })),
    oneOf: jest.fn((values: unknown[]) => ({ oneOf: values })),
  },
}));

const mockApiGet = jest.fn();
jest.mock('@lib/apiClient', () => ({
  apiClient: { get: (...args: unknown[]) => mockApiGet(...args) },
}));

const mockFieldsDirectoryCreate = jest.fn();
// The object literal is inlined (not a referenced outer const) — referencing one here
// resolved as undefined at mock-factory time in this file, even "mock"-prefixed;
// inlining sidesteps whatever hoisting quirk caused that.
jest.mock('@lib/camera/imageUtils', () => ({
  FIELDS_DIRECTORY: {
    exists: true,
    create: (...args: unknown[]) => mockFieldsDirectoryCreate(...args),
  },
}));

const mockDownloadFileAsync = jest.fn();
jest.mock('expo-file-system', () => {
  class FakeFile {
    uri: string;
    constructor(_parent: unknown, name?: string) {
      this.uri = `file:///fields/${name}`;
    }
    static downloadFileAsync(...args: unknown[]) {
      return mockDownloadFileAsync(...args);
    }
  }
  return { File: FakeFile };
});

const mockWriteFieldDetections = jest.fn().mockResolvedValue(undefined);
jest.mock('@features/field-capture/lib/saveUploadedField', () => ({
  writeFieldDetections: (...args: unknown[]) => mockWriteFieldDetections(...args),
}));

interface Clause {
  field: string;
  value: unknown;
}

function mockToCamel(snake: string): string {
  return snake.replace(/_([a-z])/g, (_m, c) => c.toUpperCase());
}

function mockMatches(row: Record<string, unknown>, clauses: Clause[]): boolean {
  return clauses.every(({ field, value }) => {
    const actual = row[mockToCamel(field)];
    if (value && typeof value === 'object' && 'oneOf' in value) {
      return (value as { oneOf: unknown[] }).oneOf.includes(actual);
    }
    return actual === value;
  });
}

let mockAnalysisResults: Record<string, unknown>[] = [];
let mockResultFields: Record<string, unknown>[] = [];
let mockFieldDetections: Record<string, unknown>[] = [];

jest.mock('@db/database', () => ({
  database: {
    write: jest.fn(async (fn: () => Promise<unknown>) => fn()),
    get: jest.fn((table: string) => ({
      query: jest.fn((...clauses: Clause[]) => ({
        fetch: jest.fn(async () => {
          const rows =
            table === 'analysis_results'
              ? mockAnalysisResults
              : table === 'result_fields'
                ? mockResultFields
                : mockFieldDetections;
          return rows.filter((r) => mockMatches(r, clauses));
        }),
      })),
    })),
  },
}));

import { fetchRemoteFields } from '../../src/db/sync/fetchRemoteFields';

function makeResult(overrides: Record<string, unknown> = {}) {
  return { serverId: 'result-1', status: 'CAPTURING', ...overrides };
}

function makeField(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const update = jest.fn(async (cb: (f: Record<string, unknown>) => void) => cb(field));
  const field: Record<string, unknown> = {
    id: 'local-field-1',
    serverId: 'field-1',
    resultId: 'result-1',
    localImageUri: null,
    update,
    ...overrides,
  };
  return field;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAnalysisResults = [];
  mockResultFields = [];
  mockFieldDetections = [];
});

describe('fetchRemoteFields', () => {
  it('fetches a field with no local image and no boxes yet', async () => {
    mockAnalysisResults = [makeResult()];
    const field = makeField();
    mockResultFields = [field];
    mockApiGet.mockResolvedValue({
      data: { detections: [{ id: 'd1' }], imageWidth: 800, imageHeight: 600, imageUrl: null },
    });

    await fetchRemoteFields();

    expect(mockApiGet).toHaveBeenCalledWith('/fields/field-1', { signal: undefined });
    expect(mockWriteFieldDetections).toHaveBeenCalledWith(
      'local-field-1',
      [{ id: 'd1' }],
      800,
      600,
    );
  });

  it('downloads the signed image URL and stores the local path', async () => {
    mockAnalysisResults = [makeResult()];
    mockResultFields = [makeField()];
    mockApiGet.mockResolvedValue({
      data: {
        detections: [],
        imageWidth: 800,
        imageHeight: 600,
        imageUrl: 'https://signed.example/field-1.jpg',
      },
    });
    mockDownloadFileAsync.mockResolvedValue({ uri: 'file:///fields/field-field-1.jpg' });

    await fetchRemoteFields();

    expect(mockDownloadFileAsync).toHaveBeenCalledWith(
      'https://signed.example/field-1.jpg',
      expect.anything(),
      { idempotent: true },
    );
    const field = mockResultFields[0];
    expect(field.update).toHaveBeenCalledTimes(1);
  });

  it('still saves the boxes when there is no image to download', async () => {
    mockAnalysisResults = [makeResult()];
    const field = makeField();
    mockResultFields = [field];
    mockApiGet.mockResolvedValue({
      data: { detections: [], imageWidth: 800, imageHeight: 600, imageUrl: null },
    });

    await fetchRemoteFields();

    expect(mockDownloadFileAsync).not.toHaveBeenCalled();
    expect(field.update).not.toHaveBeenCalled();
    expect(mockWriteFieldDetections).toHaveBeenCalled();
  });

  it('never fetches a field of a result that is not CAPTURING', async () => {
    mockAnalysisResults = [makeResult({ serverId: 'result-2', status: 'PENDING_CONFIRM' })];
    mockResultFields = [makeField({ resultId: 'result-2' })];

    await fetchRemoteFields();

    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('skips a field that already has a local image (captured on this device)', async () => {
    mockAnalysisResults = [makeResult()];
    mockResultFields = [makeField({ localImageUri: 'file:///fields/already-here.jpg' })];

    await fetchRemoteFields();

    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('skips a field with no server id yet (still queued offline)', async () => {
    mockAnalysisResults = [makeResult()];
    mockResultFields = [makeField({ serverId: null })];

    await fetchRemoteFields();

    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it('skips a field that already has a field_detections row', async () => {
    mockAnalysisResults = [makeResult()];
    mockResultFields = [makeField()];
    mockFieldDetections = [{ fieldId: 'local-field-1' }];

    await fetchRemoteFields();

    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it("one field's failure does not stop the rest from being fetched", async () => {
    mockAnalysisResults = [makeResult()];
    const first = makeField({ id: 'local-field-1', serverId: 'field-1' });
    const second = makeField({ id: 'local-field-2', serverId: 'field-2' });
    mockResultFields = [first, second];
    mockApiGet.mockRejectedValueOnce(new Error('network error')).mockResolvedValueOnce({
      data: { detections: [], imageWidth: 800, imageHeight: 600, imageUrl: null },
    });

    await fetchRemoteFields();

    expect(mockApiGet).toHaveBeenCalledTimes(2);
    expect(mockWriteFieldDetections).toHaveBeenCalledTimes(1);
  });

  it('does nothing when there are no CAPTURING results', async () => {
    mockAnalysisResults = [makeResult({ status: 'APPROVED' })];
    mockResultFields = [makeField()];

    await fetchRemoteFields();

    expect(mockApiGet).not.toHaveBeenCalled();
  });
});
