import { mapHistoryItemToReportItem } from '@features/reports/mappers/reportHistory.mapper';

describe('mapHistoryItemToReportItem', () => {
  it('maps every field from the history DTO', () => {
    expect(
      mapHistoryItemToReportItem({
        specimenId: 'spec-1',
        resultId: 'res-1',
        sampleUid: 'S-001',
        patientUid: 'P-001',
        testType: 'URINALYSIS',
        priorityLevel: 'ROUTINE',
        receivedAt: '2026-01-01T00:00:00Z',
        category: 'APPROVED',
        finalizedAt: '2026-01-03T00:00:00Z',
        rejectionReason: null,
      }),
    ).toEqual({
      id: 'spec-1',
      sampleUid: 'S-001',
      patientUid: 'P-001',
      testType: 'URINALYSIS',
      priorityLevel: 'ROUTINE',
      receivedAt: '2026-01-01T00:00:00Z',
      category: 'APPROVED',
      finalizedAt: '2026-01-03T00:00:00Z',
      rejectionReason: null,
    });
  });

  it('falls back sensibly when optional fields are null', () => {
    const mapped = mapHistoryItemToReportItem({
      specimenId: 'spec-2',
      resultId: null,
      sampleUid: null,
      patientUid: null,
      testType: null,
      priorityLevel: null,
      receivedAt: null,
      category: 'REJECTED',
      finalizedAt: '2026-01-05T00:00:00Z',
      rejectionReason: 'WRONG_CONTAINER',
    });

    expect(mapped.receivedAt).toBe('2026-01-05T00:00:00Z');
    expect(mapped.sampleUid).toBe('');
    expect(mapped.rejectionReason).toBe('WRONG_CONTAINER');
  });
});
