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
        patientUid: record['patient_uid'],
        testType: record['test_type'],
        status: record['status'],
        priorityLevel: record['priority_level'] ?? null,
        receivedAt: record['received_at'],
        assignedAt: record['assigned_at'] ?? null,
        completedAt: record['completed_at'] ?? null,
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
        particleClassesJson: record['particle_classes']
          ? JSON.stringify(record['particle_classes'])
          : null,
        smartDiagnosisJson: record['smart_diagnosis']
          ? JSON.stringify(record['smart_diagnosis'])
          : null,
        smartDiagnosisUnavailable: record['smart_diagnosis_unavailable'] ?? false,
        status: record['status'],
        imageId: record['image_id'] ?? null,
        confirmedAt: record['confirmed_at'] ?? null,
        confirmedBy: record['confirmed_by'] ?? null,
        approvedAt: record['approved_at'] ?? null,
        releasedAt: record['released_at'] ?? null,
        returnReason: record['return_reason'] ?? null,
      };

    case 'manual_overrides':
      // Pulled from the server, so it's already synced — matches how a confirmed
      // override response is mapped locally (manualOverride.mapper.ts's mapManualOverride).
      return {
        ...base,
        resultId: record['result_id'],
        parameter: record['parameter_name'],
        originalAiValue: record['original_ai_value'] ?? null,
        correctedValue: record['corrected_value'],
        rationale: record['rationale'],
        overriddenBy: record['medtech_id'],
        isSynced: true,
        createdAt: Date.parse(record['overridden_at'] as string),
      };

    default:
      return base;
  }
}
