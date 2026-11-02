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
  noSignificantDiagnosticIndicators: 'No significant diagnostic indicators found.',
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

  // Capture error codes the backend answers with a bare machine-readable code
  // and no MedTech-facing message (core/exceptions.py) — everything else
  // (INVALID_IMAGE_FORMAT, INVALID_IMAGE_RESOLUTION, IMAGE_TOO_LARGE,
  // AI_ANALYSIS_FAILED, STORAGE_ERROR) already carries its own message from
  // the server (mobile PR #55 review, 3.10).
  captureErrorMessages: {
    RESULT_NOT_EDITABLE: 'This sample is no longer capturing — open it from the queue.',
    SPECIMEN_REJECTED: 'This sample was rejected.',
    SPECIMEN_NOT_ASSIGNED: 'This sample is no longer assigned to you.',
    CONSENT_REFUSED: 'The patient refused processing — this sample can’t be analysed.',
    FEATURE_DISABLED: 'This feature isn’t available yet. Please try again later.',
  } as Record<string, string>,

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
  sendingDecisionsBlockedMessage: 'Sending your decisions…',
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
