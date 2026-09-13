/**
 * Contract regression test for pullChanges (GET /sync/pull).
 *
 * This is the exact code path that broke in production twice: once when the
 * backend's wrapper keys (`queueAssignments`/`analysisResults`) were
 * snake_case, and once when a client-side casing "cleanup" nearly flipped
 * the per-row fields to camelCase too. The wire contract intentionally mixes
 * casing — camelCase envelope/wrapper keys, snake_case per-row fields — and
 * that split is easy to get wrong in either direction.
 *
 * These fixtures mirror the backend's actual response shape (see
 * src/services/sync_service.py / src/schemas/sync.py in urolens-backend) so
 * a future edit that "fixes" the casing on either side of the split fails
 * loudly here instead of silently dropping fields at runtime.
 */

jest.mock('@lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

jest.mock('@db/sync/conflictResolver', () => ({
  resolveConflict: jest.fn(() => 'SERVER_WINS'),
  applyResolution: jest.fn((_strategy, serverValue: unknown) => serverValue),
}));

const mockCollections = new Map<
  string,
  { created: Record<string, unknown>[]; existing: Record<string, unknown>[] }
>();

function mockMakeCollection(tableName: string) {
  if (!mockCollections.has(tableName)) {
    mockCollections.set(tableName, { created: [], existing: [] });
  }
  const state = mockCollections.get(tableName)!;
  return {
    create: jest.fn(async (builder: (model: Record<string, unknown>) => void) => {
      const model: Record<string, unknown> = {};
      builder(model);
      state.created.push(model);
      return model;
    }),
    query: jest.fn(() => ({
      fetch: jest.fn(async () => state.existing),
    })),
  };
}

jest.mock('@db/database', () => ({
  database: {
    write: jest.fn((fn: () => Promise<void>) => fn()),
    get: jest.fn((tableName: string) => mockMakeCollection(tableName)),
  },
}));

import { pullChanges } from '../../src/db/sync/pullChanges';
import apiClient from '@lib/apiClient';

function fixtureResponse() {
  return {
    data: {
      timestamp: '2026-09-12T00:00:00.000Z',
      changes: {
        specimens: {
          created: [
            {
              id: 'spec-1',
              sample_uid: 'S-001',
              patient_name: 'Jane Doe',
              patient_uid: 'P-001',
              test_type: 'URINALYSIS',
              status: 'PENDING',
              priority_level: 'ROUTINE',
              received_at: '2026-09-11T10:00:00Z',
              assigned_at: null,
              medtech_id: null,
              rejection_reason: null,
              rejection_note: null,
              rejected_at: null,
            },
          ],
          updated: [],
        },
        queueAssignments: {
          created: [
            {
              id: 'qa-1',
              specimen_id: 'spec-1',
              medtech_id: 'mt-1',
              assigned_at: '2026-09-11T10:05:00Z',
              status: 'ASSIGNED',
            },
          ],
          updated: [],
        },
        analysisResults: {
          created: [
            {
              id: 'ar-1',
              specimen_id: 'spec-1',
              ai_findings: { RBC: 3 },
              flagged_anomalies: {},
              smart_diagnosis: null,
              smart_diagnosis_unavailable: false,
              status: 'PENDING_CONFIRM',
              image_id: 'img-1',
              confirmed_at: null,
              confirmed_by: null,
            },
          ],
          updated: [],
        },
      },
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCollections.clear();
});

describe('pullChanges', () => {
  it('requests /sync/pull without a query param on a full sync', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(fixtureResponse());
    await pullChanges(null);
    expect(apiClient.get).toHaveBeenCalledWith('/sync/pull');
  });

  it('sends lastSyncedAt as a camelCase query param on a delta sync', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(fixtureResponse());
    await pullChanges('2026-09-10T00:00:00Z');
    expect(apiClient.get).toHaveBeenCalledWith('/sync/pull?lastSyncedAt=2026-09-10T00%3A00%3A00Z');
  });

  it('returns the server timestamp for the caller to persist', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(fixtureResponse());
    const result = await pullChanges(null);
    expect(result).toBe('2026-09-12T00:00:00.000Z');
  });

  it('maps a snake_case specimens row under the camelCase "specimens" wrapper key', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(fixtureResponse());
    await pullChanges(null);

    const [created] = mockCollections.get('specimens')!.created;
    expect(created).toEqual(
      expect.objectContaining({
        serverId: 'spec-1',
        sampleUid: 'S-001',
        patientName: 'Jane Doe',
        patientUid: 'P-001',
        testType: 'URINALYSIS',
        status: 'PENDING',
        priorityLevel: 'ROUTINE',
        receivedAt: '2026-09-11T10:00:00Z',
      }),
    );
  });

  it('maps a snake_case row under the camelCase "queueAssignments" wrapper key', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(fixtureResponse());
    await pullChanges(null);

    const [created] = mockCollections.get('queue_assignments')!.created;
    expect(created).toEqual(
      expect.objectContaining({
        serverId: 'qa-1',
        specimenId: 'spec-1',
        medtechId: 'mt-1',
        assignedAt: '2026-09-11T10:05:00Z',
        status: 'ASSIGNED',
      }),
    );
  });

  it('maps a snake_case row under the camelCase "analysisResults" wrapper key', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue(fixtureResponse());
    await pullChanges(null);

    const [created] = mockCollections.get('analysis_results')!.created;
    expect(created).toEqual(
      expect.objectContaining({
        serverId: 'ar-1',
        specimenId: 'spec-1',
        aiFindingsJson: JSON.stringify({ RBC: 3 }),
        flaggedAnomaliesJson: JSON.stringify({}),
        smartDiagnosisJson: null,
        smartDiagnosisUnavailable: false,
        status: 'PENDING_CONFIRM',
        imageId: 'img-1',
      }),
    );
  });

  it('creates/updates nothing for a table whose wrapper key is absent from the response', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { timestamp: '2026-09-12T00:00:00.000Z', changes: {} },
    });
    await pullChanges(null);

    // The dedupe pass (below) reads every table unconditionally every sync,
    // so mockCollections will have entries for all three — but none of
    // them should have had a create/update applied.
    for (const table of ['specimens', 'queue_assignments', 'analysis_results']) {
      expect(mockCollections.get(table)?.created ?? []).toEqual([]);
    }
  });

  it('creates a local record from an "updated" row when no local match exists yet (delta sync of a new record)', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        timestamp: '2026-09-12T00:00:00.000Z',
        changes: {
          specimens: {
            created: [],
            updated: [
              {
                id: 'spec-2',
                sample_uid: 'S-002',
                patient_name: 'John Roe',
                patient_uid: 'P-002',
                test_type: 'URINALYSIS',
                status: 'PENDING',
                priority_level: 'STAT',
                received_at: '2026-09-11T11:00:00Z',
              },
            ],
          },
        },
      },
    });

    await pullChanges('2026-09-10T00:00:00Z');

    const [created] = mockCollections.get('specimens')!.created;
    expect(created).toEqual(expect.objectContaining({ serverId: 'spec-2', sampleUid: 'S-002' }));
  });

  // Regression: a replayed/resent "created" batch (same server_id the
  // client already has) was inserting a second local row instead of
  // updating the existing one — the actual cause of duplicated cards in
  // the Queue, and of "Sample not found" once only one copy kept receiving
  // updates.
  it('updates the existing local record instead of inserting a duplicate for a "created" row whose server_id is already known locally', async () => {
    const existingRecord: Record<string, unknown> = {
      serverId: 'spec-1',
      sampleUid: 'STALE-UID',
    };
    const updateMock = jest.fn(async (fn: (r: Record<string, unknown>) => void) => {
      fn(existingRecord);
    });
    existingRecord['update'] = updateMock;

    mockCollections.set('specimens', { created: [], existing: [existingRecord] });
    (apiClient.get as jest.Mock).mockResolvedValue(fixtureResponse());

    await pullChanges(null);

    expect(mockCollections.get('specimens')!.created).toEqual([]);
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(existingRecord['sampleUid']).toBe('S-001');
    expect(existingRecord['serverId']).toBe('spec-1');
  });
});
