import type { QueueStatus } from './status';

export interface QueueStatusStyle {
  label: string;
  // Solid color: badge text, accents, icons.
  color: string;
  // Soft fill behind icons and chips, and a lighter wash for whole tiles.
  tint: string;
  wash: string;
  // The badge label needs more contrast on its tint than the accent color gives.
  badgeText: string;
  icon: 'flask-outline' | 'timer-sand' | 'undo-variant';
}

// One place for what each Queue status looks like. The card badge, the stats tiles,
// the filter chips and the card accents all read from it, so a status is always the
// same color wherever it shows up. (Which status a sample has is decided in ./status.)
export const QUEUE_STATUS_STYLES: Record<QueueStatus, QueueStatusStyle> = {
  ASSIGNED: {
    label: 'ASSIGNED',
    color: '#2E7D7A',
    tint: '#E0F2F1',
    wash: '#EEF7F6',
    badgeText: '#2E7D7A',
    icon: 'flask-outline',
  },
  PROCESSING: {
    label: 'IN PROGRESS',
    color: '#7C3AED',
    tint: '#EDE9FE',
    wash: '#F5F3FF',
    badgeText: '#7C3AED',
    icon: 'timer-sand',
  },
  RETURNED: {
    label: 'RETURNED',
    color: '#D97706',
    tint: '#FEF3C7',
    wash: '#FFF8E7',
    badgeText: '#92400E',
    icon: 'undo-variant',
  },
};
