// Path: urolens-mobile/src/db/models/AnalysisResult.ts
import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';
import type { ResultStatus as ResultStatusEnum } from '@app-types/enums';

// Derived from the canonical enum (@app-types/enums), which matches the
// backend's ResultStatus exactly (analysis_result.py's ResultStatus). This
// used to declare two extra values here — IMAGE_RETAKE_REQUESTED and
// FAILED — that were never read, written, or synced anywhere, and that the
// backend enum doesn't have (writing either would be rejected by its
// Postgres enum constraint). Removed rather than documented as
// intentionally-local, since nothing ever used them either way.
export type ResultStatus = `${ResultStatusEnum}`;

export interface AIFindings {
  [particle: string]: number;
}

/** Class name to count; see ResultField for the multi-field workflow's per-field use. */
export type ParticleCounts = Record<string, number>;

export interface FieldSummaryAggregate {
  mean: number;
  min: number;
  max: number;
  total: number;
  fieldsSeen: number;
  aiMean: number;
  displayValue: string;
  fieldsAboveNormal?: number[];
}

export interface FieldSummary {
  fieldCount: number;
  perClass: Record<string, FieldSummaryAggregate>;
  focalFindings?: { particleType: string; fieldNos: number[] }[];
}

export interface ConditionScore {
  level: 'LOW' | 'MODERATE' | 'HIGH';
  weighted_score: number;
  evidence: unknown[];
  condition?: string;
}

export interface SmartDiagnosisJson {
  gout: ConditionScore;
  glomerulonephritis: ConditionScore;
  nephrolithiasis: ConditionScore;
  no_significant_indicators: boolean;
  unavailable?: boolean;
}

export default class AnalysisResult extends Model {
  static table = 'analysis_results';

  @field('server_id') serverId!: string | null;
  @field('specimen_id') specimenId!: string;
  @field('image_id') imageId!: string | null;
  @field('status') status!: ResultStatus;
  @field('ai_findings_json') aiFindingsJson!: string;
  @field('smart_diagnosis_json') smartDiagnosisJson!: string | null;
  @field('smart_diagnosis_unavailable') smartDiagnosisUnavailable!: boolean;
  @field('confirmed_at') confirmedAt!: string | null;
  @field('confirmed_by') confirmedBy!: string | null;
  @field('approved_at') approvedAt!: string | null;
  @field('released_at') releasedAt!: string | null;
  @field('particle_classes_json') particleClassesJson!: string | null;
  @field('return_reason') returnReason!: string | null;
  @field('is_synced') isSynced!: boolean;
  @field('created_at') createdAt!: number;
  @field('synced_at') syncedAt!: string | null;
  // Multi-field workflow (SDD Module 2 proposal); null/0 for a legacy
  // single-image result.
  @field('field_count') fieldCount!: number | null;
  @field('field_summary_json') fieldSummaryJson!: string | null;

  // Computed getter — parses JSONB string safely
  get aiFindings(): AIFindings {
    try {
      return JSON.parse(this.aiFindingsJson) as AIFindings;
    } catch {
      return {};
    }
  }

  // Computed getter — MedTech-confirmed classification after any overrides, parsed safely
  get particleClasses(): AIFindings {
    if (!this.particleClassesJson) return {};
    try {
      return JSON.parse(this.particleClassesJson) as AIFindings;
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

  // Computed getter — the final per-class averages stored at confirmation, parsed safely
  get fieldSummary(): FieldSummary | null {
    if (!this.fieldSummaryJson) return null;
    try {
      return JSON.parse(this.fieldSummaryJson) as FieldSummary;
    } catch {
      return null;
    }
  }
}
