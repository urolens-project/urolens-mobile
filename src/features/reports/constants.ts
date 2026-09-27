import { colors } from '@src/theme';

import type { ReportCategory } from './types';

export interface CategoryStyle {
  // The one remaining source of category identity now that cards carry no
  // icon or color heading — used for the big count number.
  color: string;
  // Soft background wash for the count badge in the drilldown header.
  tint: string;
  // Very light wash for the whole category card, and the mid-tone disc that
  // sits behind its illustration.
  wash: string;
  blob: string;
}

// Shared between the category grid and the drilled-down list, so both read
// as the same visual language. RELEASED uses the app's own brand teal —
// it's the terminal success state, so it earns the brand color; APPROVED
// stays a conventional green, PENDING an amber "awaiting action", REJECTED
// the same red used everywhere else in the app for rejections.
export const REPORT_CATEGORY_STYLES: Record<ReportCategory, CategoryStyle> = {
  PENDING_APPROVAL: {
    color: colors.amber600,
    tint: colors.amber100,
    wash: colors.amberTint3,
    blob: colors.amberTint4,
  },
  APPROVED: {
    color: colors.emerald600,
    tint: colors.emerald50,
    wash: colors.tealTint6,
    blob: colors.greenTint4,
  },
  RELEASED: {
    color: colors.teal,
    tint: colors.tealTint,
    wash: colors.tealTint7,
    blob: colors.tealTint8,
  },
  REJECTED: {
    color: colors.red600,
    tint: colors.red50,
    wash: colors.redTint3,
    blob: colors.redTint5,
  },
};
