import type { ResultStatus } from '@app-types/enums';
import type { SmartDiagnosisJson } from '@db/models/AnalysisResult';
import type { SmartDiagnosisResult } from '../types';

/**
 * Why Smart Diagnosis is (or isn't) showing:
 *  - READY: there is a diagnosis to display.
 *  - PREVIEW_UNAVAILABLE: no upload-time preview is available for review.
 *  - AWAITING_SYNC: confirmed on this device but still queued, so the server hasn't
 *    run the diagnosis yet.
 *  - UNAVAILABLE: the engine failed, or a synced confirmation came back without one.
 */
export type SmartDiagnosisState = 'READY' | 'PREVIEW_UNAVAILABLE' | 'AWAITING_SYNC' | 'UNAVAILABLE';

interface GetSmartDiagnosisStateParams {
  status: `${ResultStatus}`;
  smartDiagnosis: SmartDiagnosisJson | SmartDiagnosisResult | null;
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
    return 'PREVIEW_UNAVAILABLE';
  }
  return isSynced ? 'UNAVAILABLE' : 'AWAITING_SYNC';
}

export const SMART_DIAGNOSIS_MESSAGES: Record<Exclude<SmartDiagnosisState, 'READY'>, string> = {
  PREVIEW_UNAVAILABLE:
    'Smart Diagnosis preview is unavailable. It will be recalculated when you confirm this result.',
  AWAITING_SYNC:
    'Your confirmation is queued. Smart Diagnosis will refresh once this device syncs.',
  UNAVAILABLE: 'Smart Diagnosis is unavailable for this sample. Try reloading the result.',
};
