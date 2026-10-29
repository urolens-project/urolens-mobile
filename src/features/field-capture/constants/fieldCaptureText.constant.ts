/** User-facing copy for the multi-field capture workflow (SDD Module 2 proposal). */
export const FIELD_CAPTURE_TEXT = {
  // Capture session (CameraLiveView additions)
  magnificationLabel: 'Magnification',
  fieldCounterLabel: (acceptedCount: number, minFields: number): string =>
    `${acceptedCount} of ${minFields} fields`,

  // FieldResultScreen
  fieldResultTitle: (fieldNo: number): string => `Field ${fieldNo}`,
  thisFieldOnlyCaption: 'This field only — not the reported diagnosis',
  smartDiagnosisUnavailableMessage: 'Smart Diagnosis preview unavailable for this field.',
  proceedLabel: 'Proceed',
  discardLabel: 'Discard',
  discardModalTitle: 'Discard this field?',
  discardModalBody:
    'This field and its AI analysis will be dropped. It will not count toward the minimum. This action cannot be undone.',
  keepFieldLabel: 'Keep Field',
  confirmDiscardLabel: 'Discard Field',

  // Errors
  acceptFailedMessage: 'Could not accept this field. Please try again.',
  discardFailedMessage: 'Could not discard this field. Please try again.',
  uploadFailedFallbackMessage: 'Upload failed. Please check your connection and try again.',

  // FieldListScreen
  fieldListTitle: 'Fields',
  captureMoreLabel: 'Capture More Fields',
  submitForVerificationLabel: 'Submit for Verification',
  submittingLabel: 'Submitting…',
  undecidedFieldsBlockedMessage: (count: number): string =>
    `${count} field${count === 1 ? '' : 's'} not reviewed.`,
  belowMinimumBlockedMessage: (acceptedCount: number, minFields: number): string =>
    `${acceptedCount} of ${minFields} fields accepted.`,
  submitOfflineBlockedMessage: 'Connect to submit.',
  submitFailedTitle: 'Submit Failed',
  submitSucceededTitle: 'Submitted for Verification',
  submitSucceededMessage: 'Continue on the website to verify and confirm this result.',
  emptyFieldListMessage: 'No fields captured yet.',
  fieldDiscardedLabel: 'Discarded',
  fieldWaitingToUploadLabel: 'Waiting to upload…',
  fieldNeedsDecisionLabel: 'Needs your decision — tap to review',

  // Offline capture backlog
  offlineCaptureQueuedTitle: 'Saved',
  offlineCaptureQueuedMessage:
    'It will upload once you are back online — check the field list to decide on it then.',
} as const;
