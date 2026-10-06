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

export interface ResultReviewDetail {
  resultId: string;
  specimenId: string;
  sampleUid: string;
  patientUid: string;
  patientAge: number | null;
  patientSex: string | null;
  imageUrl: string | null;
  status: string;
  returnReason: string | null;
  aiFindings: AIFindingEntry[];
  smartDiagnosis: SmartDiagnosisResult | null;
  smartDiagnosisUnavailable: boolean;
}

export type ConfirmResultResponse = {
  id: string;
  resultId: string;
  confirmedBy: string;
  confirmedAt: string;
};
