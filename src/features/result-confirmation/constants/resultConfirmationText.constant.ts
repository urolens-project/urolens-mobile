interface AIDisclaimerText {
  accessibilityLabel: string;
  label: string;
  body: string;
}

interface AIFindingsText {
  title: string;
  emptyTitle: string;
  emptyBody: string;
  anomalousCountLabel: (count: number) => string;
}

interface ParameterRowText {
  anomalousBadge: string;
  overrideButton: string;
  overriddenBadgeLabel: (aiCount: number) => string;
  overrideAccessibilityLabel: (parameter: string) => string;
}

interface ResultImageText {
  title: string;
  accessibilityLabel: string;
  unavailableMessage: string;
}

interface PatientSummaryLabels {
  patientUid: string;
  sampleId: string;
  age: string;
  sex: string;
  test: string;
}

interface PatientSummaryText {
  title: string;
  labels: PatientSummaryLabels;
  unavailableValue: string;
}

interface ActionBarText {
  confirmOnline: string;
  confirmOffline: string;
  reconfirm: string;
  saving: string;
  retakeAccessibility: string;
  retake: string;
  continueLabel: string;
}

interface ResultNotFoundText {
  title: string;
  body: string;
}

interface ReviewStatusText {
  missingReasonWithDetail: string;
  missingReasonWithoutDetail: string;
  returnedForCorrectionTitle: string;
  pendingSupervisorTitle: string;
  approvedTitle: string;
  approvedBody: string;
  releasedTitle: string;
  releasedBody: string;
  escalatedTitle: string;
  escalatedBody: string;
}

interface SmartDiagnosisPanelText {
  unavailableTitle: string;
  title: string;
  unavailableBody: string;
  noSignificantIndicators: string;
  previewCaption: string;
  supervisorReviewCaption: string;
}

interface ConfirmAlertsText {
  confirmationFailedTitle: string;
  resubmittedTitle: string;
  confirmedTitle: string;
  resubmittedMessage: string;
  confirmedMessage: string;
  resubmittedQueuedMessage: string;
  confirmedQueuedMessage: string;
}

interface ResultConfirmationText {
  aiDisclaimer: AIDisclaimerText;
  aiFindings: AIFindingsText;
  parameterRow: ParameterRowText;
  resultImage: ResultImageText;
  patientSummary: PatientSummaryText;
  backToQueueLabel: string;
  titleBarTitle: string;
  pendingConfirmationSubtitle: string;
  submittedForApprovalSubtitle: string;
  returnedForCorrectionLabel: string;
  actionBar: ActionBarText;
  resultNotFound: ResultNotFoundText;
  refreshAccessibilityLabel: string;
  loadingAccessibilityLabel: string;
  rejectSpecimenLabel: string;
  reviewStatus: ReviewStatusText;
  smartDiagnosisPanel: SmartDiagnosisPanelText;
  confirmAlerts: ConfirmAlertsText;
  resultNotFoundRetryMessage: string;
  resultDetailLoadErrorMessage: string;
  confirmDefaultErrorMessage: string;
}

export const RESULT_CONFIRMATION_TEXT: ResultConfirmationText = {
  aiDisclaimer: {
    accessibilityLabel: 'AI disclaimer',
    label: 'Clinical Decision Support',
    body:
      'UroLens is a clinical decision-support tool. AI-generated findings and Smart Diagnosis ' +
      'indicators are not substitutes for professional medical judgment. All results must be ' +
      'reviewed and confirmed by a licensed Medical Technologist and Laboratory Supervisor.',
  },
  aiFindings: {
    title: 'AI Findings',
    emptyTitle: 'No particles detected',
    emptyBody: 'AI analysis returned no findings for this image.',
    anomalousCountLabel: (count: number): string => `${count} anomal${count === 1 ? 'y' : 'ies'}`,
  },
  parameterRow: {
    anomalousBadge: 'Anomalous',
    overrideButton: 'Override',
    overriddenBadgeLabel: (aiCount: number): string => `Overridden · AI: ${aiCount}`,
    overrideAccessibilityLabel: (parameter: string): string => `Override ${parameter}`,
  },
  resultImage: {
    title: 'Sample Image',
    accessibilityLabel: 'Microscopy image',
    unavailableMessage: 'Microscopy image unavailable. Connect and pull down to refresh.',
  },
  patientSummary: {
    title: 'Patient & Sample',
    labels: {
      patientUid: 'Patient UID',
      sampleId: 'Sample ID',
      age: 'Age',
      sex: 'Sex',
      test: 'Test',
    },
    unavailableValue: 'Unavailable',
  },
  backToQueueLabel: 'Back to Confirmation Queue',
  titleBarTitle: 'Analysis Result',
  pendingConfirmationSubtitle: 'Pending your confirmation',
  submittedForApprovalSubtitle: 'Submitted for Supervisor approval',
  returnedForCorrectionLabel: 'Returned for Correction',
  actionBar: {
    confirmOnline: 'Confirm Result',
    confirmOffline: 'Queue Confirmation',
    reconfirm: 'Re-confirm & Submit',
    saving: 'Saving & submitting…',
    retakeAccessibility: 'Retake image',
    retake: 'Retake Image',
    continueLabel: 'Continue',
  },
  resultNotFound: {
    title: 'Result not found',
    body: 'This result may not have synced yet.',
  },
  refreshAccessibilityLabel: 'Refresh result details',
  loadingAccessibilityLabel: 'Loading result details',
  rejectSpecimenLabel: 'Reject Specimen',
  reviewStatus: {
    missingReasonWithDetail:
      'The supervisor returned this result without a reason. Contact the supervisor before correcting it.',
    missingReasonWithoutDetail:
      'Connect and pull down to refresh to view the supervisor’s correction reason.',
    returnedForCorrectionTitle: 'Returned for Correction',
    pendingSupervisorTitle: 'Awaiting supervisor review.',
    approvedTitle: 'Approved by Supervisor',
    approvedBody: 'This result is ready for release.',
    releasedTitle: 'Result Released',
    releasedBody: 'This result has been released to the patient.',
    escalatedTitle: 'Critical / Escalated',
    escalatedBody: 'The supervisor has escalated this result for urgent review.',
  },
  smartDiagnosisPanel: {
    unavailableTitle: 'Diagnosis unavailable',
    title: 'Smart Diagnosis',
    unavailableBody: 'Smart Diagnosis is unavailable for this sample.',
    noSignificantIndicators: 'No significant diagnostic indicators found.',
    previewCaption: 'Preview',
    supervisorReviewCaption: 'Supervisor review',
  },
  confirmAlerts: {
    confirmationFailedTitle: 'Confirmation Failed',
    resubmittedTitle: 'Result Re-submitted',
    confirmedTitle: 'Result Confirmed',
    resubmittedMessage: 'The result has been re-submitted for supervisor approval.',
    confirmedMessage: 'The result has been submitted for supervisor approval.',
    resubmittedQueuedMessage:
      'Your re-confirmation is queued and will be re-submitted for supervisor approval when the device syncs.',
    confirmedQueuedMessage:
      'Your confirmation is queued and will be sent for supervisor approval when the device syncs.',
  },
  resultNotFoundRetryMessage: 'Result not found. Please retry.',
  resultDetailLoadErrorMessage: 'Could not load the result details. Please retry.',
  confirmDefaultErrorMessage: 'Failed to confirm result',
};
