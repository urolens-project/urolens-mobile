export const OVERRIDE_TEXT = {
  title: 'Override Parameter',
  backAccessibilityLabel: 'Go back to Analysis Result',
  loadingAccessibilityLabel: 'Loading original AI finding',
  savingAccessibilityLabel: 'Saving override',
  cancelAccessibilityLabel: 'Cancel and go back to Analysis Result',
  cancelButtonText: 'Cancel',
  submitLabelOnline: 'Submit Override',
  submitLabelOffline: 'Queue Override',

  aiValueLabel: 'AI-generated value',
  aiValueReadonlyNote: 'Read-only — original preserved',
  currentValuePrefix: 'Current corrected value:',
  correctedValueLabel: 'Corrected value',
  correctedValuePlaceholder: 'Enter corrected count',
  correctedValueAccessibilityLabel: 'Corrected value',
  rationaleLabel: 'Rationale',
  rationalePlaceholder: 'Explain why you are overriding this value (required)',
  rationaleAccessibilityLabel: 'Rationale for override',

  queuedAlertTitle: 'Override queued',
  queuedAlertMessage:
    'Your correction is saved on this device and will be submitted when it syncs.',
  discardAlertTitle: 'Unsaved correction',
  discardAlertMessage: 'Leave without saving this correction?',
  keepEditingLabel: 'Keep editing',
  discardChangesLabel: 'Discard changes',

  missingAiFindingError: 'The original AI finding is unavailable. Return to the result and retry.',
  missingSpecimenError:
    'The sample identifier is missing. Return to the queue and reopen the result.',
  notEditableError:
    'This result is no longer editable. Return to the result to see its current status.',
  loadContextError: 'Could not load the original AI finding. Return to the result and retry.',
  signInAgainError: 'Sign in again before submitting a correction.',
  submitFailedError: 'Failed to submit override. Please retry.',
  valueUnchangedError: 'The corrected value must differ from the current value.',
  rationaleRequiredError: 'Enter a rationale for this correction.',

  /** @description Submit button label, which differs when the correction will only be queued offline. */
  getSubmitLabel(isOnline: boolean): string {
    return isOnline ? OVERRIDE_TEXT.submitLabelOnline : OVERRIDE_TEXT.submitLabelOffline;
  },
  /** @description Preservation notice shown above the submit button, naming the original AI value. */
  getOverrideNoticeText(originalAiValue: number): string {
    return `Both the original AI value (${originalAiValue}) and your corrected value will be stored and visible to the Supervisor.`;
  },
  /** @description Accessibility label for the read-only original AI value field. */
  getOriginalAiValueAccessibilityLabel(originalAiValue: number): string {
    return `Original AI value: ${originalAiValue}`;
  },
  /** @description Helper text under the corrected-value input, stating the accepted range. */
  getCorrectedValueRangeHelper(max: number): string {
    return `Required: a whole number from 0 to ${max}.`;
  },
  /** @description Validation error when the entered count is missing or out of range. */
  getCorrectedValueRangeError(max: number): string {
    return `Enter a whole number from 0 to ${max}.`;
  },
  /** @description Validation error when the rationale exceeds the allowed length. */
  getRationaleLengthError(max: number): string {
    return `Keep the rationale within ${max} characters.`;
  },
  /** @description Character counter under the rationale input. */
  getCharCountLabel(length: number, max: number): string {
    return `${length}/${max} characters`;
  },
};
