export const SPECIMEN_REJECTION_TEXT = {
  screenTitle: 'Reject Specimen',
  backLabel: 'Go back',

  queuedAlertTitle: 'Rejection queued',
  queuedAlertMessage:
    'This specimen was rejected on this device. The rejection will be submitted when you are back online.',
  failedAlertTitle: 'Rejection Failed',

  blockedTitle: 'Cannot reject this specimen',
  blockedBackToSample: 'Back to sample',

  warningText: 'Rejecting a specimen is permanent and cannot be undone.',
  reasonSectionTitle: 'Select Rejection Reason',
  notesSectionTitle: 'Notes (Optional)',
  notePlaceholder: 'Add additional context or details...',
  noteAccessibilityLabel: 'Additional notes',
  confirmButtonLabel: 'Confirm Rejection',
  retryButtonLabel: 'Retry Saving Rejection',
  confirmAccessibilityLabel: 'Confirm rejection',
  retryAccessibilityLabel: 'Retry saving rejection',

  staleSpecimenMessage: 'Return to the queue to refresh this specimen.',
  reasonRequiredMessage: 'Select a rejection reason.',
  localSaveFailedMessage:
    'The server accepted this rejection, but this device could not save it. Retry to update this device.',
  genericFailedMessage: 'Failed to reject specimen. Please try again.',
  infoLoadFailedMessage: 'Unable to load this specimen. Return to the queue and try again.',

  specimenNotFoundMessage: 'This specimen could not be found. Return to the queue and try again.',
  notAssignedMessage: 'You can only reject a specimen assigned to you.',
  notSyncedMessage: 'Specimen has not been synced to the server yet.',

  /**
   * @description Error copy for a rejection note that exceeds the character limit.
   * @param maxLength - The maximum allowed note length.
   */
  noteTooLongMessage: (maxLength: number): string =>
    `Notes must be ${maxLength} characters or fewer.`,
} as const;
