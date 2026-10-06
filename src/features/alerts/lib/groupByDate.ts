import type { NotificationItem } from '../types';

export interface NotificationGroup {
  title: string;
  data: NotificationItem[];
}

const DAY_MS = 86_400_000;
const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * @description Labels a notification's date per the Alerts page grouping rule: Today,
 * Yesterday, the weekday name for the past week, then a full date beyond that.
 * @param createdAt - ISO timestamp the notification was created at.
 * @param now - Reference "today"; overridable so callers (and tests) get stable output.
 */
function dateGroupTitle(createdAt: string, now: Date): string {
  const today = startOfDay(now);
  const created = startOfDay(new Date(createdAt));
  const diffDays = Math.round((today.getTime() - created.getTime()) / DAY_MS);

  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return WEEKDAY_NAMES[created.getDay()];
  return created.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * @description Buckets notifications into date-based sections for a SectionList, newest
 * group first. Assumes `items` is already sorted newest first, which it is coming out of
 * the notifications store (the API returns newest-first, and mark-read/mark-all-read
 * never reorder it).
 * @param items - Notifications to group, newest first.
 * @param now - Reference time for labeling; defaults to the current time.
 */
export function groupNotificationsByDate(
  items: NotificationItem[],
  now: Date = new Date(),
): NotificationGroup[] {
  const groups: NotificationGroup[] = [];
  const indexByTitle = new Map<string, number>();

  for (const item of items) {
    const title = dateGroupTitle(item.createdAt, now);
    const existingIndex = indexByTitle.get(title);

    if (existingIndex === undefined) {
      indexByTitle.set(title, groups.length);
      groups.push({ title, data: [item] });
    } else {
      groups[existingIndex].data.push(item);
    }
  }

  return groups;
}
