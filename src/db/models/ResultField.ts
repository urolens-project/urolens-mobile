// Path: urolens-mobile/src/db/models/ResultField.ts
import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

import type { ParticleCounts } from './AnalysisResult';

// Mirrors the backend's FieldStatus enum, plus one client-only value: a
// field captured on this device that hasn't reached the server yet (see
// the offline capture queue). PENDING_UPLOAD is never sent to or received
// from the server.
export type FieldStatus = 'PENDING_UPLOAD' | 'ANALYZED' | 'ACCEPTED' | 'DISCARDED';

export type Magnification = 'HPF' | 'LPF';

export interface SmartDiagnosisPreview {
  [key: string]: unknown;
}

export default class ResultField extends Model {
  static table = 'result_fields';

  @field('server_id') serverId!: string | null;
  @field('result_id') resultId!: string;
  @field('specimen_id') specimenId!: string;
  @field('image_id') imageId!: string | null;
  @field('field_no') fieldNo!: number;
  @field('magnification') magnification!: Magnification;
  @field('status') status!: FieldStatus;
  @field('ai_findings_json') aiFindingsJson!: string;
  @field('effective_counts_json') effectiveCountsJson!: string;
  @field('confidence_scores_json') confidenceScoresJson!: string;
  @field('image_width') imageWidth!: number;
  @field('image_height') imageHeight!: number;
  @field('smart_diagnosis_json') smartDiagnosisJson!: string | null;
  @field('smart_diagnosis_unavailable') smartDiagnosisUnavailable!: boolean;
  @field('local_image_uri') localImageUri!: string | null;
  @field('version') version!: number | null;
  @field('is_synced') isSynced!: boolean;
  @field('created_at') createdAt!: number;
  @field('synced_at') syncedAt!: string | null;
  // Set when the system discards a field automatically (a queued offline
  // capture refused as IMAGE_NOT_MICROSCOPY / IMAGE_EXPOSURE); null for a
  // MedTech's own discard decision.
  @field('discard_reason') discardReason!: string | null;

  // Computed getter — parses the AI count-per-class JSON safely
  get aiFindings(): ParticleCounts {
    try {
      return JSON.parse(this.aiFindingsJson) as ParticleCounts;
    } catch {
      return {};
    }
  }

  // Computed getter — AI counts after any web correction; equals aiFindings
  // until the MedTech corrects it on the web verification workspace
  get effectiveCounts(): ParticleCounts {
    try {
      return JSON.parse(this.effectiveCountsJson) as ParticleCounts;
    } catch {
      return {};
    }
  }

  get confidenceScores(): ParticleCounts {
    try {
      return JSON.parse(this.confidenceScoresJson) as ParticleCounts;
    } catch {
      return {};
    }
  }

  // Computed getter — this field's own Smart Diagnosis preview; informational
  // only, labelled "this field only," and never the reported diagnosis
  get smartDiagnosis(): SmartDiagnosisPreview | null {
    if (!this.smartDiagnosisJson) return null;
    try {
      return JSON.parse(this.smartDiagnosisJson) as SmartDiagnosisPreview;
    } catch {
      return null;
    }
  }
}
