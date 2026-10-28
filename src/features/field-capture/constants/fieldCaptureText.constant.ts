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
  offlineUploadBlockedMessage:
    'A connection is required to upload this field. Connect and try again.',
  uploadFailedFallbackMessage: 'Upload failed. Please check your connection and try again.',
} as const;
