// Path: urolens-mobile/src/features/result-confirmation/types.ts
export type ScoreLevel = 'LOW' | 'MODERATE' | 'HIGH';

export interface AIFindingEntry {
  parameter: string;
  count: number;
  isAnomalous: boolean;
}

export interface SmartDiagnosisResult {
  goutScore: ScoreLevel;
  gnScore: ScoreLevel;
  nephroScore: ScoreLevel;
  noSignificantIndicators: boolean;
  evidenceMap: Record<string, unknown>;
  unavailable: boolean;
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

export type ConfirmResultResponse = {
  id: string;
  resultId: string;
  confirmedBy: string;
  confirmedAt: string;
};