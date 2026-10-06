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
