import type { components } from '@app-types/api';
import type { SmartDiagnosisJson } from '@db/models/AnalysisResult';

import type {
  ResultReviewDetail,
  AnnotationDraft,
  SmartDiagnosisResult,
  AIFindingEntry,
  ReviewerAnnotation,
} from '../types';

/**
 * @description Keeps API data and other reviewers' corrections separate from the editable draft.
 * @param dto - Backend result detail.
 * @param userId - The MedTech whose own annotation may be edited.
 */
export function mapResultReviewDetail(
  dto: components['schemas']['FullResultDetail'],
  userId: string | null,
): ResultReviewDetail {
  const ownAnnotation = dto.annotations.find(
    (annotation): boolean => annotation.reviewedBy === userId,
  );
  const annotation: AnnotationDraft = {
    annotationNotes: ownAnnotation?.annotationNotes ?? '',
    spatialAnnotations: ownAnnotation?.spatialAnnotations ?? [],
  };
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
    annotation,
    aiFindings: Object.entries(dto.aiFindings).map(
      ([parameter, count]): AIFindingEntry => ({
        parameter,
        count: typeof count === 'number' ? count : 0,
        isAnomalous: !!dto.flaggedAnomalies[parameter],
      }),
    ),
    smartDiagnosis: mapSmartDiagnosis(dto.smartDiagnosis as SmartDiagnosisJson | null),
    smartDiagnosisUnavailable: dto.smartDiagnosisUnavailable,
    otherAnnotations: dto.annotations
      .filter((item): boolean => item.reviewedBy !== userId)
      .map(
        (item): ReviewerAnnotation => ({
          reviewedBy: item.reviewedBy,
          reviewerRole: item.reviewerRole,
          annotationNotes: item.annotationNotes ?? '',
          spatialAnnotations: item.spatialAnnotations ?? [],
        }),
      ),
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
