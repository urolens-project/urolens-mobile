import type { ResultStatus } from '@app-types/enums';
import type { SmartDiagnosisJson } from '@db/models/AnalysisResult';

/**
 * Why Smart Diagnosis is (or isn't) showing:
 *  - READY: there is a diagnosis to display.
 *  - AFTER_CONFIRMATION: not generated yet — the server runs it when the MedTech
 *    confirms the result, so there is nothing wrong.
 *  - AWAITING_SYNC: confirmed on this device but still queued, so the server hasn't
 *    run the diagnosis yet.
 *  - UNAVAILABLE: the engine failed, or a synced confirmation came back without one.
 */
export type SmartDiagnosisState = 'READY' | 'AFTER_CONFIRMATION' | 'AWAITING_SYNC' | 'UNAVAILABLE';

interface GetSmartDiagnosisStateParams {
  status: `${ResultStatus}`;
  smartDiagnosis: SmartDiagnosisJson | null;
  /** The result row's own `smart_diagnosis_unavailable` flag. */
  unavailable: boolean;
  /** False while a confirmation made on this device is still waiting to reach the server. */
  isSynced: boolean;
}

/**
 * @description Derives which of the four Smart Diagnosis states (see `SmartDiagnosisState`
 * above) applies to a result, so the panel can show the right message instead of a blank.
 * @param params - Result status, diagnosis payload, and sync/unavailability flags.
 */
export function getSmartDiagnosisState({
  status,
  smartDiagnosis,
  unavailable,
  isSynced,
}: GetSmartDiagnosisStateParams): SmartDiagnosisState {
  if (unavailable || smartDiagnosis?.unavailable) return 'UNAVAILABLE';
  if (smartDiagnosis) return 'READY';
  if (status === 'PENDING_CONFIRM' || status === 'RETURNED_FOR_CORRECTION') {
    return 'AFTER_CONFIRMATION';
  }
  return isSynced ? 'UNAVAILABLE' : 'AWAITING_SYNC';
}

export const SMART_DIAGNOSIS_MESSAGES: Record<Exclude<SmartDiagnosisState, 'READY'>, string> = {
  AFTER_CONFIRMATION: 'Smart Diagnosis is generated after you confirm this result.',
  AWAITING_SYNC: 'Your confirmation is queued. Smart Diagnosis will appear once this device syncs.',
  UNAVAILABLE:
    'Smart Diagnosis is unavailable — the engine reported an error. The Supervisor has been notified.',
};
