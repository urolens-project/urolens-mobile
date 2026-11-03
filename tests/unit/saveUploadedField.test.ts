/**
 * saveUploadedField / createQueuedFieldUpload — the capture-id dedup contract (backend
 * #108, mobile-n8-todo-rem.md B2 / M14).
 *
 * A retried "Use Image" whose first answer the phone never saw sends the same
 * capture_id, and the backend answers with the same fieldId instead of analysing the
 * photo again — the local write must land on one result_fields row either way, not two.
 */

jest.mock('@nozbe/watermelondb', () => ({
  Q: { where: jest.fn((field: string, value: unknown) => ({ field, value })) },
}));

interface FakeField {
  id: string;
  [key: string]: unknown;
  update: jest.Mock;
}

const mockResultFieldsState: { rows: FakeField[] } = { rows: [] };
const mockAnalysisResultsState: { rows: FakeField[] } = { rows: [] };
const mockPendingSyncCreated: Record<string, unknown>[] = [];
let mockNextId = 0;

function mockToCamel(snake: string): string {
  return snake.replace(/_([a-z])/g, (_m, c) => c.toUpperCase());
}

function mockMakeResultFieldsCollection() {
  return {
    create: jest.fn(async (builder: (f: FakeField) => void) => {
      const row: FakeField = { id: `local-${++mockNextId}`, update: jest.fn() };
      row.update.mockImplementation(async (cb: (f: FakeField) => void) => cb(row));
      builder(row);
      mockResultFieldsState.rows.push(row);
      return row;
    }),
    query: jest.fn((clause: { field: string; value: unknown }) => {
      const matches = mockResultFieldsState.rows.filter(
        (r) => r[mockToCamel(clause.field)] === clause.value,
      );
      return {
        fetch: jest.fn(async () => matches),
        fetchCount: jest.fn(async () => matches.length),
      };
    }),
    find: jest.fn(async (id: string) => mockResultFieldsState.rows.find((r) => r.id === id)),
    prepareCreate: jest.fn((builder: (f: FakeField) => void) => {
      const row: FakeField = { id: `local-${++mockNextId}`, update: jest.fn() };
      row.update.mockImplementation(async (cb: (f: FakeField) => void) => cb(row));
      builder(row);
      mockResultFieldsState.rows.push(row);
      return row;
    }),
  };
}

jest.mock('@db/database', () => ({
  database: {
    write: jest.fn(async (fn: () => Promise<unknown>) => fn()),
    get: jest.fn((table: string) => {
      if (table === 'result_fields') return mockMakeResultFieldsCollection();
      if (table === 'analysis_results') {
        return {
          query: jest.fn(() => ({ fetch: jest.fn(async () => mockAnalysisResultsState.rows) })),
          create: jest.fn(async (builder: (f: FakeField) => void) => {
            const row: FakeField = { id: `result-${++mockNextId}`, update: jest.fn() };
            builder(row);
            mockAnalysisResultsState.rows.push(row);
            return row;
          }),
        };
      }
      if (table === 'field_detections') {
        return {
          query: jest.fn(() => ({ fetch: jest.fn(async () => []) })),
          create: jest.fn(async (builder: (f: FakeField) => void) => {
            const row: FakeField = { id: `det-${++mockNextId}`, update: jest.fn() };
            builder(row);
            return row;
          }),
        };
      }
      if (table === 'pending_sync') {
        return {
          prepareCreate: jest.fn((builder: (f: FakeField) => void) => {
            const row: FakeField = { id: `pending-${++mockNextId}`, update: jest.fn() };
            builder(row);
            mockPendingSyncCreated.push(row);
            return row;
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    }),
    batch: jest.fn(async () => {}),
  },
}));

import {
  createQueuedFieldUpload,
  saveUploadedField,
} from '../../src/features/field-capture/lib/saveUploadedField';
import type { FieldAnalysisResponseDto } from '../../src/features/field-capture/types';

function makeResponse(overrides: Partial<FieldAnalysisResponseDto> = {}): FieldAnalysisResponseDto {
  return {
    fieldId: 'server-field-1',
    fieldNo: 1,
    magnification: 'HPF',
    resultId: 'server-result-1',
    imageId: 'img-1',
    status: 'ANALYZED',
    aiFindings: { RBC: 2 },
    detections: [],
    imageWidth: 800,
    imageHeight: 600,
    confidenceScores: {},
    smartDiagnosisPreview: null,
    smartDiagnosisUnavailable: false,
    acceptedFieldCount: 0,
    minFields: 10,
    ...overrides,
  };
}

beforeEach(() => {
  mockResultFieldsState.rows = [];
  mockAnalysisResultsState.rows = [];
  mockPendingSyncCreated.length = 0;
  mockNextId = 0;
});

describe('saveUploadedField', () => {
  it('creates one local field for a single upload', async () => {
    await saveUploadedField('srv-specimen-1', 'file:///a.jpg', makeResponse());
    expect(mockResultFieldsState.rows).toHaveLength(1);
    expect(mockResultFieldsState.rows[0].serverId).toBe('server-field-1');
  });

  // The retry got no local trace of the first attempt's success (that's the whole
  // point of capture_id): this call looks like a brand new upload to the phone,
  // identical in every way to the first except the server already knows this fieldId.
  it('updates the same local field instead of creating a second one when the server replies with the same fieldId', async () => {
    const response = makeResponse();
    await saveUploadedField('srv-specimen-1', 'file:///a.jpg', response);
    await saveUploadedField('srv-specimen-1', 'file:///a.jpg', response);

    expect(mockResultFieldsState.rows).toHaveLength(1);
    expect(mockResultFieldsState.rows[0].update).toHaveBeenCalledTimes(1);
  });

  it('still creates a second field for a genuinely different fieldId', async () => {
    await saveUploadedField('srv-specimen-1', 'file:///a.jpg', makeResponse({ fieldId: 'f-1' }));
    await saveUploadedField('srv-specimen-1', 'file:///b.jpg', makeResponse({ fieldId: 'f-2' }));

    expect(mockResultFieldsState.rows).toHaveLength(2);
  });
});

describe('createQueuedFieldUpload', () => {
  it('stores the capture id on the queued UPLOAD_IMAGE action so a replay can send it', async () => {
    await createQueuedFieldUpload('srv-specimen-1', 'HPF', 'file:///a.jpg', 'capture-id-1');

    expect(mockPendingSyncCreated).toHaveLength(1);
    expect(mockPendingSyncCreated[0].payloadJson).toBe(
      JSON.stringify({ captureId: 'capture-id-1' }),
    );
  });
});
