// Path: urolens-mobile/src/features/manual-override/types.ts
export interface OverridePayload {
  parameter: string;
  originalAiValue: number;
  correctedValue: number;
  rationale: string;
}

export interface ManualOverrideRecord {
  id: string;
  resultId: string;
  parameter: string;
  originalAiValue: number;
  correctedValue: number;
  rationale: string;
  overriddenBy: string;
  isSynced: boolean;
  createdAt: string;
}

export type OverrideResponse = {
  id: string;
  resultId: string;
  parameter: string;
  originalAiValue: number;
  correctedValue: number;
  rationale: string;
};