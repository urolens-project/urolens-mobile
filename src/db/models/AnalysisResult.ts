// Path: urolens-mobile/src/db/models/AnalysisResult.ts
import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export type ResultStatus =
  | 'PENDING_CONFIRM'
  | 'PENDING_SUPERVISOR_APPROVAL'
  | 'APPROVED'
  | 'RELEASED'
  | 'RETURNED_FOR_CORRECTION'
  | 'CRITICAL_ESCALATED';

export interface AIFindings {
  [particle: string]: number;
}

export interface SmartDiagnosisJson {
  gout_score: 'LOW' | 'MODERATE' | 'HIGH';
  gn_score: 'LOW' | 'MODERATE' | 'HIGH';
  nephro_score: 'LOW' | 'MODERATE' | 'HIGH';
  no_significant_indicators: boolean;
  evidence_map: Record<string, unknown>;
  unavailable?: boolean;
}

export default class AnalysisResult extends Model {
  static table = 'analysis_results';

  @field('server_id') serverId!: string | null;
  @field('specimen_id') specimenId!: string;
  @field('image_id') imageId!: string;
  @field('status') status!: ResultStatus;
  @field('ai_findings_json') aiFindingsJson!: string;
  @field('smart_diagnosis_json') smartDiagnosisJson!: string | null;
  @field('smart_diagnosis_unavailable') smartDiagnosisUnavailable!: boolean;
  @field('confirmed_at') confirmedAt!: string | null;
  @field('confirmed_by') confirmedBy!: string | null;
  @field('is_synced') isSynced!: boolean;
  @field('created_at') createdAt!: number;
  @field('synced_at') syncedAt!: string | null;

  // Computed getter — parses JSONB string safely
  get aiFindings(): AIFindings {
    try {
      return JSON.parse(this.aiFindingsJson) as AIFindings;
    } catch {
      return {};
    }
  }

  // Computed getter — parses smart diagnosis JSON safely
  get smartDiagnosis(): SmartDiagnosisJson | null {
    if (!this.smartDiagnosisJson) return null;
    try {
      return JSON.parse(this.smartDiagnosisJson) as SmartDiagnosisJson;
    } catch {
      return null;
    }
  }

  get isConfirmed(): boolean {
    return this.status === 'PENDING_SUPERVISOR_APPROVAL' || this.status === 'APPROVED';
  }
}