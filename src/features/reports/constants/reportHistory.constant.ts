import type { ReportPeriodOption } from '../types';

export const REPORT_PERIOD_OPTIONS: ReportPeriodOption[] = [
  { value: 'ALL', label: 'All dates', days: null },
  { value: 'LAST_7_DAYS', label: 'Last 7 days', days: 7 },
  { value: 'LAST_30_DAYS', label: 'Last 30 days', days: 30 },
];

export const REPORT_SPECIMEN_COLUMNS = [
  'server_id',
  'sample_uid',
  'patient_uid',
  'test_type',
  'priority_level',
  'received_at',
  'status',
  'rejected_at',
  'rejection_reason',
];

export const REPORT_RESULT_COLUMNS = [
  'specimen_id',
  'status',
  'confirmed_at',
  'approved_at',
  'released_at',
  'synced_at',
  'created_at',
];

// How often to re-sync while this tab stays focused, so a supervisor's action (e.g.
// approving/releasing a result) shows up without needing to leave and re-enter the
// tab. A push notification already triggers an immediate sync separately (see
// notificationHandler.ts); this just covers the gap between those.
export const REPORT_FOCUS_POLL_INTERVAL_MS = 30_000;

export const REPORT_ANIMATED_ITEMS = 8;
export const REPORT_ITEM_STAGGER_MS = 90;

// Below this many locally-synced samples, assume there's nothing older worth paging into
// and hide "Load older samples" until the server confirms otherwise. Without this, the
// button shows for every category on first render (historyTotal is unknown until fetched),
// even ones with a single sample.
export const REPORT_HISTORY_LOAD_MORE_THRESHOLD = 10;
