import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import type { ReportCategory } from './types';

export interface CategoryStyle {
  // Primary accent — icon, count, top edge of the category card
  color: string;
  // Soft background wash for the icon badge
  tint: string;
  icon: ComponentProps<typeof Ionicons>['name'];
}

// Shared between the category grid and the drilled-down list, so both read
// as the same visual language. RELEASED uses the app's own brand teal —
// it's the terminal success state, so it earns the brand color; APPROVED
// stays a conventional green checkmark, PENDING an amber "awaiting action",
// REJECTED the same red used everywhere else in the app for rejections.
export const REPORT_CATEGORY_STYLES: Record<ReportCategory, CategoryStyle> = {
  PENDING_APPROVAL: { color: '#D97706', tint: '#FEF3C7', icon: 'time-outline' },
  APPROVED: { color: '#059669', tint: '#ECFDF5', icon: 'checkmark-circle-outline' },
  RELEASED: { color: '#2E7D7A', tint: '#E0F2F1', icon: 'send-outline' },
  REJECTED: { color: '#DC2626', tint: '#FEF2F2', icon: 'close-circle-outline' },
};
