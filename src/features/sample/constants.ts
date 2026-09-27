// The result columns the sample detail screen reads. WatermelonDB's plain
// `query.observe()` only re-emits when rows are added or removed — not when a row is
// updated in place, which is how a sync brings in a Supervisor's approval, return or
// escalation. Naming the columns makes the screen follow those changes live.
export const RESULT_COLUMNS = [
  'status',
  'ai_findings_json',
  'smart_diagnosis_json',
  'smart_diagnosis_unavailable',
  'is_synced',
  'image_id',
];
