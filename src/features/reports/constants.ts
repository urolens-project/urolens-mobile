import type { ReportCategory } from './types';

export interface CategoryStyle {
  // The one remaining source of category identity now that cards carry no
  // icon or color heading — used for the big count number.
  color: string;
  // Soft background wash for the count badge in the drilldown header.
  tint: string;
}

// Shared between the category grid and the drilled-down list, so both read
// as the same visual language. RELEASED uses the app's own brand teal —
// it's the terminal success state, so it earns the brand color; APPROVED
// stays a conventional green, PENDING an amber "awaiting action", REJECTED
// the same red used everywhere else in the app for rejections.
export const REPORT_CATEGORY_STYLES: Record<ReportCategory, CategoryStyle> = {
  PENDING_APPROVAL: { color: '#D97706', tint: '#FEF3C7' },
  APPROVED: { color: '#059669', tint: '#ECFDF5' },
  RELEASED: { color: '#2E7D7A', tint: '#E0F2F1' },
  REJECTED: { color: '#DC2626', tint: '#FEF2F2' },
};
