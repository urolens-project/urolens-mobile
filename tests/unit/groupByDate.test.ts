import { groupNotificationsByDate } from '@features/alerts/lib/groupByDate';
import type { NotificationItem } from '@features/alerts/types';

const NOW = new Date('2026-10-04T12:00:00.000Z');

function notificationAt(id: string, daysAgo: number): NotificationItem {
  const createdAt = new Date(NOW.getTime() - daysAgo * 86_400_000);
  return {
    notificationId: id,
    message: `alert ${id}`,
    notificationType: 'SAMPLE_ASSIGNED',
    entityId: null,
    isRead: false,
    createdAt: createdAt.toISOString(),
  };
}

describe('groupNotificationsByDate', () => {
  it('returns no sections for an empty list', () => {
    expect(groupNotificationsByDate([], NOW)).toEqual([]);
  });

  it('buckets same-day notifications under "Today"', () => {
    const groups = groupNotificationsByDate(
      [notificationAt('n-1', 0), notificationAt('n-2', 0)],
      NOW,
    );
    expect(groups).toEqual([{ title: 'Today', data: expect.any(Array) }]);
    expect(groups[0].data).toHaveLength(2);
  });

  it('labels yesterday and named weekdays for the past week, then falls back to a full date', () => {
    const groups = groupNotificationsByDate(
      [
        notificationAt('today', 0),
        notificationAt('yesterday', 1),
        notificationAt('week-ago', 3),
        notificationAt('old', 10),
      ],
      NOW,
    );

    const titles = groups.map((g) => g.title);
    expect(titles[0]).toBe('Today');
    expect(titles[1]).toBe('Yesterday');
    // 3 days before 2026-10-04 (a Sunday) is 2026-10-01, a Thursday.
    expect(titles[2]).toBe('Thursday');
    // 10 days back falls outside the "past week" bucket — a full date, not a weekday name.
    expect(titles[3]).not.toBe('Yesterday');
    expect(titles[3]).not.toBe('Today');
    expect(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']).not.toContain(
      titles[3],
    );
  });

  it('keeps newest-first group order, matching the newest-first input', () => {
    const groups = groupNotificationsByDate(
      [notificationAt('a', 0), notificationAt('b', 1), notificationAt('c', 0)],
      NOW,
    );
    expect(groups.map((g) => g.title)).toEqual(['Today', 'Yesterday']);
    expect(groups[0].data.map((n) => n.notificationId)).toEqual(['a', 'c']);
  });
});
