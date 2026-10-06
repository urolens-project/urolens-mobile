import type { components } from '@app-types/api';
import type { SmartDiagnosisJson } from '@db/models/AnalysisResult';

import type { ResultReviewDetail, SmartDiagnosisResult, AIFindingEntry } from '../types';

/**
 * @description Maps server result details to the mobile review model.
 * @param dto - Backend result detail.
 */
export function mapResultReviewDetail(
  dto: components['schemas']['FullResultDetail'],
): ResultReviewDetail {
  return {
    resultId: dto.resultId,
    specimenId: dto.specimenId,
    sampleUid: dto.sampleUid ?? '',
    patientUid: dto.patientUid ?? '',
    patientAge: dto.patientAge ?? null,
    patientSex: dto.patientSex ?? null,
    imageUrl: dto.imageUrl ?? null,
    status: dto.status,
    returnReason: dto.returnReason ?? null,
    aiFindings: Object.entries(dto.aiFindings).map(
      ([parameter, count]): AIFindingEntry => ({
        parameter,
        count: typeof count === 'number' ? count : 0,
        isAnomalous: !!dto.flaggedAnomalies[parameter],
      }),
    ),
    smartDiagnosis: mapSmartDiagnosis(dto.smartDiagnosis as SmartDiagnosisJson | null),
    smartDiagnosisUnavailable: dto.smartDiagnosisUnavailable,
  };
}

/**
 * @description Translates the engine's payload into camelCase values for the diagnosis panel.
 * @param diagnosis - Engine payload from the API or local cache.
 */
export function mapSmartDiagnosis(
  diagnosis: SmartDiagnosisJson | null,
): SmartDiagnosisResult | null {
  if (!diagnosis || diagnosis.unavailable) return null;
  return {
    goutScore: diagnosis.gout?.level,
    gnScore: diagnosis.glomerulonephritis?.level,
    nephroScore: diagnosis.nephrolithiasis?.level,
    noSignificantIndicators: diagnosis.no_significant_indicators,
    evidenceMap: {
      gout: diagnosis.gout,
      glomerulonephritis: diagnosis.glomerulonephritis,
      nephrolithiasis: diagnosis.nephrolithiasis,
    },
    unavailable: !!diagnosis.unavailable,
  };
}
