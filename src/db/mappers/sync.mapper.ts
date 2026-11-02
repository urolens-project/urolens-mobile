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
        // field_count/field_summary deliberately NOT mapped here: the
        // backend's synced analysis_results rows have never carried either
        // key (see mobile PR #55 review, 3.1), so reading them wrote null
        // over the locally-tracked accepted count on every pull. Leaving
        // these two keys out of the returned object means processUpdates
        // (pullChanges.ts) never touches the local columns, so the
        // locally-tracked value survives. Anything showing an accepted
        // count reads it live off result_fields instead (which does sync
        // fully) rather than off this column.
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

    case 'result_fields':
      // Unlike every table above, the published SyncResultField contract
      // (sync_service.py's _fieldRow) is camelCase — the one deliberate
      // exception, same as backend's own comment there says. It also has no
      // top-level "id" (fieldId is the row's identity instead); pullChanges.ts
      // aliases fieldId to id before this runs, so base.serverId is already
      // correct. local_image_uri is never set here — a field pulled from
      // elsewhere has no local file, and leaving the key out of this object
      // preserves one this device already captured.
      return {
        ...base,
        resultId: record['resultId'],
        specimenId: record['specimenId'],
        imageId: record['imageId'] ?? null,
        fieldNo: record['fieldNo'],
        magnification: record['magnification'],
        status: record['status'],
        aiFindingsJson: JSON.stringify(record['aiFindings'] ?? {}),
        effectiveCountsJson: JSON.stringify(record['effectiveCounts'] ?? {}),
        confidenceScoresJson: JSON.stringify(record['confidenceScores'] ?? {}),
        imageWidth: record['imageWidth'],
        imageHeight: record['imageHeight'],
        smartDiagnosisJson: record['smartDiagnosisPreview']
          ? JSON.stringify(record['smartDiagnosisPreview'])
          : null,
        smartDiagnosisUnavailable: record['smartDiagnosisUnavailable'] ?? false,
        version: record['version'],
        isSynced: true,
      };

    default:
      return base;
  }
}
