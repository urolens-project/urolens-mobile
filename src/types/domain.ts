import { ProbabilityLevel, ResultStatus } from './enums';

// Backend wire contract intentionally mixes casing: JSON envelope/wrapper
// keys are camelCase, but per-row/nested payload fields mirror raw snake_case
// DB columns (see urolens-backend's sync_service.py and smart_diagnosis_service.py).
// The snake_case fields below are not a leftover to "fix" — they document
// the real wire shape of AnalysisResultDTO/SmartDiagnosisDTO's nested data.

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  role: string;
  userId: string;
  /** When this access token expires (ISO 8601); refresh before then to keep working. */
  expiresAt: string;
  /** When the session ends for good (end of the shift); no refresh goes past it. */
  sessionExpiresAt: string;
  /** Inactivity limit for this role: a session with no request for this long is signed out server-side. */
  idleTimeoutMinutes: number;
  /** How long before the idle timeout the app should warn the user, in seconds. */
  idleWarningSeconds: number;
}

/** Response body for `POST /auth/refresh` — a new token for the same session. */
export interface TokenRefreshResponse {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  sessionExpiresAt: string;
  idleTimeoutMinutes: number;
  idleWarningSeconds: number;
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

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  // HTTP status of the response. Absent when there was no response at all
  // (no network, timeout) — which is itself worth knowing when deciding to retry.
  status?: number;
}
