import { colors } from '@src/theme';

import type { QueueStatus } from './status';
import type { SyncPillTone } from './syncPill';
import type { FilterOption } from './types';

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
    color: colors.teal,
    tint: colors.tealTint,
    wash: colors.tealTint2,
    badgeText: colors.teal,
    icon: 'flask-outline',
  },
  PROCESSING: {
    label: 'IN PROGRESS',
    color: colors.violet600,
    tint: colors.violet100,
    wash: colors.violet50,
    badgeText: colors.violet600,
    icon: 'timer-sand',
  },
  RETURNED: {
    label: 'RETURNED',
    color: colors.amber600,
    tint: colors.amber100,
    wash: colors.amberTint2,
    badgeText: colors.amber800,
    icon: 'undo-variant',
  },
};

export interface QueueStatsTile {
  status: QueueStatus;
  label: string;
  key: 'assigned' | 'inProgress' | 'returned';
}

// Order the Queue Stats tiles render in — one per status, most-attention-first.
export const QUEUE_STATS_TILES: QueueStatsTile[] = [
  { status: 'ASSIGNED', label: 'Assigned', key: 'assigned' },
  { status: 'PROCESSING', label: 'In Progress', key: 'inProgress' },
  { status: 'RETURNED', label: 'Returned', key: 'returned' },
];

export interface SyncPillToneStyle {
  bg: string;
  border: string;
  dot: string;
  text: string;
}

// Colors for the Queue's sync pill, one set per SyncPillTone.
export const SYNC_PILL_TONE_STYLES: Record<SyncPillTone, SyncPillToneStyle> = {
  ok: { bg: colors.emerald50, border: colors.emerald200, dot: colors.emerald500, text: colors.emerald800 },
  caution: { bg: colors.amber100, border: colors.amber200, dot: colors.amber600, text: colors.amber800 },
  error: { bg: colors.red100, border: colors.red200, dot: colors.red600, text: colors.red800 },
};

export interface DateSubFilter {
  key: Extract<FilterOption, 'LATEST' | 'EARLIEST'>;
  label: string;
  icon: 'arrow-down-outline' | 'arrow-up-outline';
}

// The Date group's sub-chips, in the Filter Bar.
export const DATE_SUB_FILTERS: DateSubFilter[] = [
  { key: 'LATEST', label: 'Latest', icon: 'arrow-down-outline' },
  { key: 'EARLIEST', label: 'Earliest', icon: 'arrow-up-outline' },
];

export interface StatusSubFilter {
  key: Extract<FilterOption, 'ASSIGNED' | 'PROCESSING' | 'RETURNED'>;
  label: string;
  color: string;
  bg: string;
}

// The Status group's sub-chips, in the Filter Bar — same colors as QUEUE_STATUS_STYLES.
export const STATUS_SUB_FILTERS: StatusSubFilter[] = [
  { key: 'ASSIGNED', label: 'Assigned', color: colors.teal, bg: colors.tealTint },
  { key: 'PROCESSING', label: 'In Progress', color: colors.violet600, bg: colors.violet100 },
  { key: 'RETURNED', label: 'Returned', color: colors.amber600, bg: colors.amber100 },
];
