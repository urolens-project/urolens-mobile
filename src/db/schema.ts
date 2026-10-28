import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 7,
  tables: [
    tableSchema({
      name: 'specimens',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'sample_uid', type: 'string' },
        { name: 'patient_uid', type: 'string' },
        { name: 'test_type', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'priority_level', type: 'string', isOptional: true },
        { name: 'received_at', type: 'string' },
        { name: 'assigned_at', type: 'string', isOptional: true },
        { name: 'completed_at', type: 'string', isOptional: true },
        { name: 'medtech_id', type: 'string', isOptional: true },
        { name: 'rejection_reason', type: 'string', isOptional: true },
        { name: 'rejection_note', type: 'string', isOptional: true },
        { name: 'rejected_at', type: 'string', isOptional: true },
        { name: 'synced_at', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'queue_assignments',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'specimen_id', type: 'string' },
        { name: 'medtech_id', type: 'string' },
        { name: 'assigned_at', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'synced_at', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'analysis_results',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'specimen_id', type: 'string' },
        { name: 'image_id', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'ai_findings_json', type: 'string' },
        { name: 'smart_diagnosis_json', type: 'string', isOptional: true },
        { name: 'smart_diagnosis_unavailable', type: 'boolean' },
        { name: 'confirmed_at', type: 'string', isOptional: true },
        { name: 'confirmed_by', type: 'string', isOptional: true },
        { name: 'approved_at', type: 'string', isOptional: true },
        { name: 'released_at', type: 'string', isOptional: true },
        { name: 'particle_classes_json', type: 'string', isOptional: true },
        { name: 'return_reason', type: 'string', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'synced_at', type: 'string', isOptional: true },
        // kept for migrated installs — not exposed in model
        { name: 'flagged_anomalies_json', type: 'string', isOptional: true },
        // Multi-field workflow (SDD Module 2 proposal): accepted field count and
        // the final per-class averages, synced from analysis_results.field_count /
        // field_summary. Null/0 for a legacy single-image result.
        { name: 'field_count', type: 'number', isOptional: true },
        { name: 'field_summary_json', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'manual_overrides',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'result_id', type: 'string' },
        { name: 'parameter', type: 'string' },
        { name: 'original_ai_value', type: 'number' },
        { name: 'corrected_value', type: 'number' },
        { name: 'rationale', type: 'string' },
        { name: 'overridden_by', type: 'string' },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'synced_at', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'pending_sync',
      columns: [
        { name: 'entity', type: 'string' },
        { name: 'entity_id', type: 'string' },
        { name: 'action', type: 'string' },
        { name: 'payload_json', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'error_message', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'attempted_at', type: 'number', isOptional: true },
      ],
    }),
    // ── Multi-field workflow (SDD Module 2 proposal) ───────────────────────────
    // One captured microscope field of a specimen's result. Mirrors the
    // backend's SyncResultField /sync/pull shape plus local-only bookkeeping
    // (local_image_uri, is_synced). A row with server_id null and status
    // PENDING_UPLOAD is a field captured on this device that hasn't reached
    // the server yet (see the offline capture queue, Section 8 of the
    // proposal) — PENDING_UPLOAD is a client-only value, never sent to or
    // received from the server, whose ANALYZED/ACCEPTED/DISCARDED values are
    // the server's FieldStatus enum.
    tableSchema({
      name: 'result_fields',
      columns: [
        { name: 'server_id', type: 'string', isOptional: true },
        { name: 'result_id', type: 'string' },
        { name: 'specimen_id', type: 'string' },
        { name: 'image_id', type: 'string', isOptional: true },
        { name: 'field_no', type: 'number' },
        { name: 'magnification', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'ai_findings_json', type: 'string' },
        { name: 'effective_counts_json', type: 'string' },
        { name: 'confidence_scores_json', type: 'string' },
        { name: 'image_width', type: 'number' },
        { name: 'image_height', type: 'number' },
        { name: 'smart_diagnosis_json', type: 'string', isOptional: true },
        { name: 'smart_diagnosis_unavailable', type: 'boolean' },
        { name: 'local_image_uri', type: 'string', isOptional: true },
        { name: 'version', type: 'number', isOptional: true },
        { name: 'is_synced', type: 'boolean' },
        { name: 'created_at', type: 'number' },
        { name: 'synced_at', type: 'string', isOptional: true },
      ],
    }),
    // Device-only cache of one field's AI boxes, so a field shows its
    // detections offline (Section 8 of the proposal). Never synced: boxes
    // are never sent on /sync/pull, only on the capture response and
    // GET /fields/{field_id}. field_id references result_fields' local
    // WatermelonDB id, not server_id, so this row is linkable even for a
    // field still waiting on its first upload.
    tableSchema({
      name: 'field_detections',
      columns: [
        { name: 'field_id', type: 'string', isIndexed: true },
        { name: 'detections_json', type: 'string' },
        { name: 'image_width', type: 'number' },
        { name: 'image_height', type: 'number' },
      ],
    }),
  ],
});
