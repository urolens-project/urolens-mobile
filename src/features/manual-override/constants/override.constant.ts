/** Backend OverrideRequest limits; keep the entry form and offline queue consistent. */
export const MAX_OVERRIDE_COUNT = 300;
export const MAX_OVERRIDE_RATIONALE_LENGTH = 2000;
export const OVERRIDE_RESULT_COLUMNS = ['status', 'ai_findings_json', 'image_id'];
export const OVERRIDE_COLUMNS = ['corrected_value', 'created_at'];
