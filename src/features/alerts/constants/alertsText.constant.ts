export const ALERTS_TEXT = {
  title: 'Alerts',
  unreadOnlyLabel: 'Unread only',
  markAllReadLabel: 'Mark all as read',

  loadErrorFallback: 'Could not load notifications.',
  retryLabel: 'Retry',
  allCaughtUpTitle: "You're all caught up",
  noAlertsTitle: 'No alerts yet',
  noUnreadNotificationsSub: 'No unread notifications right now.',
  noAlertsSub: 'Sample assignments and result updates will appear here.',
  loadMoreLabel: 'Load more',

  previewTitle: 'Notifications',
  previewEmptyText: 'No alerts yet.',
  seeAllLabel: 'See all',

  notificationTypeTitles: {
    SAMPLE_ASSIGNED: 'Sample Assigned',
    RESULT_RETURNED: 'Result Returned',
    RESULT_READY_FOR_REVIEW: 'Ready for Review',
    SMART_DIAGNOSIS_UNAVAILABLE: 'Smart Diagnosis Unavailable',
    RESULT_RELEASED: 'Result Released',
    LAB_REQUEST_SUBMITTED: 'New Lab Request',
  } as Record<string, string>,
  defaultNotificationTitle: 'Notification',

  justNowLabel: 'just now',
  formatMinutesAgo: (mins: number): string => `${mins}m ago`,
  formatHoursAgo: (hrs: number): string => `${hrs}h ago`,
  formatDaysAgo: (days: number): string => `${days}d ago`,

  todayLabel: 'Today',
  yesterdayLabel: 'Yesterday',
  weekdayNames: [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ] as string[],
};
