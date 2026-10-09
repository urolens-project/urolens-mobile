import type { components } from '@app-types/api';

import { mapResultImageBoxes } from './imageBoxes.mapper';
import type {
  ResultReviewDetail,
  SmartDiagnosisResult,
  AIFindingEntry,
  DiagnosisEvidence,
  ScoreLevel,
} from '../types';

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
    imageId: dto.imageId ?? null,
    status: dto.status,
    returnReason: dto.returnReason ?? null,
    aiFindings: Object.entries(dto.aiFindings).map(
      ([parameter, count]): AIFindingEntry => ({
        parameter,
        count: typeof count === 'number' ? count : 0,
        isAnomalous: !!dto.flaggedAnomalies[parameter],
      }),
    ),
    smartDiagnosis: mapSmartDiagnosis(dto.smartDiagnosis),
    smartDiagnosisUnavailable: dto.smartDiagnosisUnavailable,
    imageBoxes: mapResultImageBoxes(dto),
  };
}

/**
 * @description Translates the engine's payload into camelCase values for the diagnosis panel.
 * @param diagnosis - Engine payload from the API or local cache.
 */
export function mapSmartDiagnosis(diagnosis: unknown): SmartDiagnosisResult | null {
  const payload = asRecord(diagnosis);
  if (!payload || payload.unavailable === true) return null;
  const gout = asRecord(payload.gout);
  const gn = asRecord(payload.glomerulonephritis);
  const nephro = asRecord(payload.nephrolithiasis);
  const goutScore = mapScoreLevel(payload.goutScore ?? gout?.level);
  const gnScore = mapScoreLevel(payload.gnScore ?? gn?.level);
  const nephroScore = mapScoreLevel(payload.nephroScore ?? nephro?.level);
  if (!goutScore && !gnScore && !nephroScore) return null;
  const evidence = asRecord(payload.evidenceMap);
  const hasNoIndicators = payload.noSignificantIndicators ?? payload.no_significant_indicators;
  return {
    goutScore,
    gnScore,
    nephroScore,
    noSignificantIndicators:
      hasNoIndicators === true && goutScore === 'LOW' && gnScore === 'LOW' && nephroScore === 'LOW',
    evidenceMap: {
      gout: mapEvidence(evidence?.gout ?? gout),
      glomerulonephritis: mapEvidence(evidence?.glomerulonephritis ?? gn),
      nephrolithiasis: mapEvidence(evidence?.nephrolithiasis ?? nephro),
    },
    unavailable: false,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function mapScoreLevel(value: unknown): ScoreLevel | null {
  return value === 'LOW' || value === 'MODERATE' || value === 'HIGH' ? value : null;
}

function mapEvidence(value: unknown): DiagnosisEvidence[] {
  const items = Array.isArray(value) ? value : asRecord(value)?.evidence;
  if (!Array.isArray(items)) return [];
  return items.flatMap((item: unknown): DiagnosisEvidence[] => {
    const record = asRecord(item);
    if (
      !record ||
      typeof record.particle_name !== 'string' ||
      typeof record.detected_count !== 'number' ||
      typeof record.normal_range_max !== 'number' ||
      !Number.isFinite(record.detected_count) ||
      record.detected_count < 0 ||
      !Number.isFinite(record.normal_range_max) ||
      record.normal_range_max < 0
    )
      return [];
    return [
      {
        particleName: record.particle_name,
        particleDisplayName:
          typeof record.particle_display_name === 'string'
            ? record.particle_display_name
            : record.particle_name.replace(/_/g, ' '),
        detectedCount: record.detected_count,
        normalRangeMax: record.normal_range_max,
        contributionRole:
          typeof record.contribution_role === 'string' ? record.contribution_role : '',
      },
    ];
  });
}
