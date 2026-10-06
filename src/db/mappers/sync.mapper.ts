import type { ServerRecord } from '../types';

// Envelope keys (changes.specimens/queueAssignments/analysisResults, created/updated)
// are camelCase; the per-row fields read below are intentionally snake_case,
// mirroring raw backend DB columns (see sync_service.py). Don't "fix" this split —
// it broke sync in production once already (see git history on this file).
// tests/unit/pullChanges.test.ts pins the exact field names on both sides.
/**
 * @description Maps sync rows into local models so raw field names stay at the storage boundary.
 * @param table - Local database table.
 * @param record - Server row from the sync response.
 */
export function mapServerToLocal(table: string, record: ServerRecord): Record<string, unknown> {
  const base: Record<string, unknown> = {
    serverId: record.id,
    syncedAt: new Date().toISOString(),
  };

  switch (table) {
    case 'specimens':
      return {
        ...base,
        sampleUid: record['sample_uid'],
        patientName: record['patient_name'],
        patientUid: record['patient_uid'],
        testType: record['test_type'],
        status: record['status'],
        priorityLevel: record['priority_level'] ?? null,
        receivedAt: record['received_at'],
        assignedAt: record['assigned_at'] ?? null,
        medtechId: record['medtech_id'] ?? null,
        rejectionReason: record['rejection_reason'] ?? null,
        rejectionNote: record['rejection_note'] ?? null,
        rejectedAt: record['rejected_at'] ?? null,
      };

    case 'queue_assignments':
      return {
        ...base,
        specimenId: record['specimen_id'],
        medtechId: record['medtech_id'],
        assignedAt: record['assigned_at'],
        status: record['status'],
      };

    case 'analysis_results':
      return {
        ...base,
        specimenId: record['specimen_id'],
        aiFindingsJson: JSON.stringify(record['ai_findings'] ?? {}),
        flaggedAnomaliesJson: JSON.stringify(record['flagged_anomalies'] ?? {}),
        smartDiagnosisJson: record['smart_diagnosis']
          ? JSON.stringify(record['smart_diagnosis'])
          : null,
        smartDiagnosisUnavailable: record['smart_diagnosis_unavailable'] ?? false,
        status: record['status'],
        imageId: record['image_id'] ?? null,
        confirmedAt: record['confirmed_at'] ?? null,
        confirmedBy: record['confirmed_by'] ?? null,
        returnReason: record['return_reason'] ?? null,
      };

    default:
      return base;
  }
}
