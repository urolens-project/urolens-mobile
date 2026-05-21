import { RejectionReason, ProbabilityLevel, SpecimenStatus, ResultStatus } from './enums';

export interface AuthUser {
  user_id: string;
  username: string;
  role: string;
  exp: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: string;
  user_id: string;
}

export interface QueueItem {
  specimen_id: string;
  sample_uid: string;
  patient_name: string;
  time_received: string;
  priority_level: string;
  status: SpecimenStatus;
}

export interface SpecimenDetail extends QueueItem {
  patient_uid: string;
  test_type: string;
  lab_request_id: string;
  medtech_id: string;
}

export interface RejectionPayload {
  specimen_id: string;
  reason_code: RejectionReason;
  free_text_note?: string;
}

export interface ImageUploadResponse {
  image_id: string;
  status: string;
}

export interface AnalysisResultDTO {
  result_id: string;
  specimen_id: string;
  ai_findings: Record<string, number>;
  flagged_anomalies: Record<string, number>;
  status: ResultStatus;
  smart_diagnosis?: SmartDiagnosisDTO;
}

export interface SmartDiagnosisDTO {
  gout: ConditionScore;
  glomerulonephritis: ConditionScore;
  nephrolithiasis: ConditionScore;
  no_significant_indicators: boolean;
}

export interface ConditionScore {
  condition: string;
  level: ProbabilityLevel;
  weighted_score: number;
  evidence: EvidenceItem[];
}

export interface EvidenceItem {
  particle_name: string;
  particle_display_name: string;
  detected_count: number;
  contribution_weight: number;
  contribution_role: 'primary' | 'supporting';
}

export interface OverridePayload {
  result_id: string;
  parameter_name: string;
  corrected_value: string;
  rationale: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
