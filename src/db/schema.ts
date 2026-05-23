import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'specimens',
      columns: [
        { name: 'server_id',        type: 'string',  isOptional: true },
        { name: 'sample_uid',       type: 'string' },
        { name: 'patient_name',     type: 'string' },
        { name: 'patient_uid',      type: 'string' },
        { name: 'test_type',        type: 'string' },
        { name: 'status',           type: 'string' },
        { name: 'priority_level',   type: 'string',  isOptional: true },
        { name: 'received_at',      type: 'string' },
        { name: 'assigned_at',      type: 'string',  isOptional: true },
        { name: 'medtech_id',       type: 'string',  isOptional: true },
        { name: 'rejection_reason', type: 'string',  isOptional: true },
        { name: 'rejection_note',   type: 'string',  isOptional: true },
        { name: 'rejected_at',      type: 'string',  isOptional: true },
        { name: 'synced_at',        type: 'string',  isOptional: true },
      ],
    }),
    tableSchema({
      name: 'queue_assignments',
      columns: [
        { name: 'server_id',   type: 'string', isOptional: true },
        { name: 'specimen_id', type: 'string' },
        { name: 'medtech_id',  type: 'string' },
        { name: 'assigned_at', type: 'string' },
        { name: 'status',      type: 'string' },
        { name: 'synced_at',   type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'analysis_results',
      columns: [
        { name: 'server_id',              type: 'string', isOptional: true },
        { name: 'specimen_id',            type: 'string' },
        { name: 'ai_findings_json',       type: 'string' },
        { name: 'flagged_anomalies_json', type: 'string', isOptional: true },
        { name: 'smart_diagnosis_json',   type: 'string', isOptional: true },
        { name: 'status',                 type: 'string' },
        { name: 'image_id',               type: 'string', isOptional: true },
        { name: 'synced_at',              type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'manual_overrides',
      columns: [
        { name: 'server_id',        type: 'string',  isOptional: true },
        { name: 'result_id',        type: 'string' },
        { name: 'parameter_name',   type: 'string' },
        { name: 'original_ai_value',type: 'string' },
        { name: 'corrected_value',  type: 'string' },
        { name: 'rationale',        type: 'string' },
        { name: 'is_synced',        type: 'boolean' },
        { name: 'synced_at',        type: 'string',  isOptional: true },
      ],
    }),
    tableSchema({
      name: 'pending_sync',
      columns: [
        { name: 'entity',         type: 'string' },
        { name: 'entity_id',      type: 'string' },
        { name: 'action',         type: 'string' },
        { name: 'payload_json',   type: 'string' },
        { name: 'status',         type: 'string' },
        { name: 'error_message',  type: 'string', isOptional: true },
        { name: 'created_at',     type: 'number' },
        { name: 'attempted_at',   type: 'number', isOptional: true },
      ],
    }),
  ],
});
