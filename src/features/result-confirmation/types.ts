// Path: urolens-mobile/src/features/result-confirmation/types.ts
export type ScoreLevel = 'LOW' | 'MODERATE' | 'HIGH';

export interface AIFindingEntry {
  parameter: string;
  count: number;
  isAnomalous: boolean;
}

export interface SmartDiagnosisResult {
  goutScore: ScoreLevel | null;
  gnScore: ScoreLevel | null;
  nephroScore: ScoreLevel | null;
  noSignificantIndicators: boolean;
  evidenceMap: Record<DiagnosisCondition, DiagnosisEvidence[]>;
  unavailable: boolean;
}

export type DiagnosisCondition = 'gout' | 'glomerulonephritis' | 'nephrolithiasis';

export interface DiagnosisEvidence {
  particleName: string;
  particleDisplayName: string;
  detectedCount: number;
  normalRangeMax: number;
  contributionRole: string;
}

export interface ResultDetail {
  id: string;
  specimenId: string;
  status: string;
  aiFindings: AIFindingEntry[];
  smartDiagnosis: SmartDiagnosisResult | null;
  smartDiagnosisUnavailable: boolean;
  confirmedAt: string | null;
  confirmedBy: string | null;
}

export interface ConfirmResultPayload {
  resultId: string;
}

export type ImageBoxSource = 'AI' | 'MEDTECH' | 'SUPERVISOR' | 'REVIEWER';

export interface ImageBox {
  /** Unique across all boxes on this image; namespaced by reviewer since box IDs are only unique per reviewer. */
  renderKey: string;
  id: string;
  particleType: string;
  label: string;
  /** Percentages (0-100) of the image's displayed area, not pixels or 0-1 fractions. */
  x: number;
  y: number;
  w: number;
  h: number;
  source: ImageBoxSource;
  reviewedBy: string | null;
  reviewerRole: string | null;
  updatedAt: string | null;
  confidence: number | null;
}

export interface ResultReviewDetail {
  resultId: string;
  specimenId: string;
  sampleUid: string;
  patientUid: string;
  patientAge: number | null;
  patientSex: string | null;
  imageUrl: string | null;
  imageId: string | null;
  status: string;
  returnReason: string | null;
  aiFindings: AIFindingEntry[];
  smartDiagnosis: SmartDiagnosisResult | null;
  smartDiagnosisUnavailable: boolean;
  imageBoxes: ImageBox[];
}

export type ConfirmResultResponse = {
  id: string;
  resultId: string;
  confirmedBy: string;
  confirmedAt: string;
};
