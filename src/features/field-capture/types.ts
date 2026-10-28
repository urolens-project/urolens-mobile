import type { Detection } from '@db/models/FieldDetection';
import type { FieldStatus, Magnification } from '@db/models/ResultField';

export type { Detection, FieldStatus, Magnification };

/** Wire DTO for `POST /fields` (201) — hand-typed from the backend's contract
 * (docs/contract/field-shapes.json) pending `npm run generate:types` against a
 * backend with FIELD_WORKFLOW_ENABLED on. */
export interface FieldAnalysisResponseDto {
  fieldId: string;
  fieldNo: number;
  magnification: Magnification;
  resultId: string;
  imageId: string;
  status: FieldStatus;
  aiFindings: Record<string, number>;
  detections: Detection[];
  imageWidth: number;
  imageHeight: number;
  confidenceScores: Record<string, number>;
  smartDiagnosisPreview: Record<string, unknown> | null;
  smartDiagnosisUnavailable: boolean;
  acceptedFieldCount: number;
  minFields: number;
}

/** One row of `GET /results/{id}/fields` and the `field` key of FieldActionResponseDto. */
export interface FieldSummaryItemDto {
  fieldId: string;
  resultId: string;
  fieldNo: number;
  magnification: Magnification;
  status: FieldStatus;
  imageUrl: string | null;
  aiFindings: Record<string, number>;
  effectiveCounts: Record<string, number>;
  confidenceScores: Record<string, number>;
  flags: { reason: string; particleType: string | null }[];
  hasCorrections: boolean;
  overriddenClasses: string[];
  verifiedBy: string | null;
  verifiedAt: string | null;
  discardReason: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

/** Wire DTO for accept, discard, annotations, override, revert and verify. */
export interface FieldActionResponseDto {
  field: FieldSummaryItemDto;
  acceptedFieldCount: number;
  verifiedFieldCount: number;
  undecidedFieldCount: number;
}

/** UI model for the field a MedTech just captured, ready for Proceed/Discard. */
export interface CapturedField {
  /** Local WatermelonDB id of the result_fields row — used for all further actions. */
  localId: string;
  fieldNo: number;
  magnification: Magnification;
  aiFindings: Record<string, number>;
  detections: Detection[];
  imageWidth: number;
  imageHeight: number;
  smartDiagnosisPreview: Record<string, unknown> | null;
  smartDiagnosisUnavailable: boolean;
  localImageUri: string;
  acceptedFieldCount: number;
  minFields: number;
}
