export const QUEUE_PAGE_SIZE = 20;

// Raw local database columns are kept at this boundary for reactive subscriptions.
export const QUEUE_SPECIMEN_COLUMNS = [
  'status',
  'patient_uid',
  'sample_uid',
  'received_at',
  'synced_at',
];
export const QUEUE_RESULT_COLUMNS = [
  'status',
  'return_reason',
  'confirmed_at',
  'synced_at',
  'created_at',
];
// Accepted field count is derived from result_fields rows (see useQueue.ts),
// not analysis_results.field_count — that column is never synced by the
// backend (mobile PR #55 review, 3.1).
export const QUEUE_FIELD_COLUMNS = ['specimen_id', 'status'];
