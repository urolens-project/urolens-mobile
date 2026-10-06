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
  'synced_at',
  'created_at',
];

export const REPORT_ANIMATED_ITEMS = 8;
export const REPORT_ITEM_STAGGER_MS = 90;
