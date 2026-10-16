export const PROFILE_TEXT = {
  /** Role enum value -> human-readable label shown on the Profile tab. */
  roleLabels: {
    MEDTECH: 'Medical Technologist',
    SUPERVISOR: 'Supervisor',
    RECEPTIONIST: 'Receptionist',
    PHYSICIAN: 'Physician',
    ADMINISTRATOR: 'Administrator',
  } as Record<string, string>,

  accountCardTitle: 'Account',
  usernameLabel: 'Username',
  roleLabel: 'Role',
  userIdLabel: 'User ID',
  statusLabel: 'Status',
  statusActive: 'Active',

  logoutAccessibilityLabel: 'Log out',
  logoutButtonText: 'Log Out',

  syncCardTitle: 'Data',
  lastSyncedLabel: 'Last Synced',
  syncNowAccessibilityLabel: 'Sync now',
  syncNowButtonText: 'Sync now',
  appVersionLabel: 'App Version',

  syncNeverLabel: 'Never',
  syncJustNowLabel: 'Just now',
  /** @description Relative "N minutes ago" label for the last-sync time. */
  getSyncMinutesAgoLabel: (minutes: number): string => `${minutes}m ago`,
  /** @description Relative "N hours ago" label for the last-sync time. */
  getSyncHoursAgoLabel: (hours: number): string => `${hours}h ago`,

  failedActionsDismissAccessibilityLabel: "Dismiss changes that couldn't be sent",
  failedActionsDismissButtonText: 'Dismiss',
  failedActionsExplanation:
    'The server did not accept these, so they were not saved. The app shows what the server has.',
  /** @description Header copy for the refused-changes list, pluralized by count. */
  getFailedActionsHeaderText: (count: number): string =>
    count === 1 ? "1 change couldn't be sent" : `${count} changes couldn't be sent`,
};
