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
  overriddenBadgeLabel: (aiCount: number) => string;
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
  actionBar: ActionBarText;
  resultNotFound: ResultNotFoundText;
  refreshAccessibilityLabel: string;
  loadingAccessibilityLabel: string;
  rejectSpecimenLabel: string;
  reviewStatus: ReviewStatusText;
  smartDiagnosisPanel: SmartDiagnosisPanelText;
  resultDetailLoadErrorMessage: string;
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
    overriddenBadgeLabel: (aiCount: number): string => `Overridden · AI: ${aiCount}`,
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
  actionBar: {
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
  resultDetailLoadErrorMessage: 'Could not load the result details. Please retry.',
};
