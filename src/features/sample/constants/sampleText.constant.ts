export const SAMPLE_TEXT = {
  detailTitle: 'Sample Detail',
  goBack: 'Go back',
  notFound: 'Sample not found.',
  readOnlyReport: 'Read-only report',
  analysisResultsTitle: 'Analysis Results',
  smartDiagnosisSectionTitle: 'Smart Diagnosis',
  aiFindingsSectionTitle: 'AI Findings',
  noParticlesDetected: 'No particles detected.',
  noSignificantDiagnosticIndicators: 'No significant diagnostic indicators found.',

  confirmationFailedTitle: 'Confirmation Failed',
  notSyncedTitle: 'Not Synced',
  specimenNotSyncedMessage:
    'This specimen has not been synced with the server yet. Please wait or pull to refresh.',
  retakeNotSyncedMessage: 'Specimen has not synced yet. Please wait.',
  cannotBeginAnalysisTitle: 'Cannot Begin Analysis',

  specimenRejectedTitle: 'Specimen Rejected',
  specimenRejectedBody:
    'This result cannot be confirmed and will not be sent for supervisor approval.',
  returnedForCorrectionTitle: 'Returned for Correction',
  returnedForCorrectionBody:
    'The supervisor has returned this result. Please retake the image and re-confirm.',
  criticalEscalatedTitle: 'Critical / Escalated',
  criticalEscalatedBody:
    'The supervisor has escalated this result for urgent review. No further action is needed from you.',
  awaitingSupervisorReviewTitle: 'Awaiting supervisor review.',
  approvedBySupervisorTitle: 'Approved by Supervisor',
  approvedBySupervisorBody: 'This result has been reviewed and approved. It is ready for release.',
  resultReleasedTitle: 'Result Released',
  resultReleasedBody: 'This result has been released to the patient.',

  beginAnalysis: 'Begin Analysis',
  continueAnalysis: 'Continue Analysis',
  rejectSpecimen: 'Reject Specimen',

  confirmResult: 'Confirm Result',
  confirmAnalysisResultAccessibilityLabel: 'Confirm analysis result',
  retakeImage: 'Retake Image',
  retakeImageAccessibilityLabel: 'Retake image',

  patientSampleTitle: 'Patient & Sample',
  patientUidLabel: 'Patient UID',
  testTypeLabel: 'Test Type',
  statusLabel: 'Status',
  receivedLabel: 'Received',

  rejectionReasonLabel: 'Reason',
  rejectionNoteLabel: 'Note',
  rejectedAtLabel: 'Rejected At',

  /**
   * @description Builds the AI findings override badge copy shown next to a manually
   * corrected parameter.
   * @param aiCount - The AI's original count for the overridden parameter.
   */
  getOverriddenBadgeLabel(aiCount: number): string {
    return `Overridden · AI: ${aiCount}`;
  },
};
