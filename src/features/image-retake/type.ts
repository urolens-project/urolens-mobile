// src/features/image-retake/types.ts
/**
 * Domain types for the Image Capture & Retake feature (T2.7).
 */

/** Status values for the Image row — mirrors ImageStatus enum on the backend (SDD migration 0013). */
export const ImageStatus = {
  ACTIVE: 'ACTIVE',
  DISCARDED: 'DISCARDED',
  REPLACED: 'REPLACED',
} as const;

export type ImageStatus = (typeof ImageStatus)[keyof typeof ImageStatus];

/** Shape of the POST /api/v1/images/upload response body. */
export interface UploadResponse {
  id: string;                                   // result_id alias — AnalysisResult UUID
  result_id: string;                            // AnalysisResult UUID
  specimen_id: string;
  image_id: string | null;
  status: string;                               // ResultStatus (e.g. PENDING_CONFIRM)
  ai_findings: Record<string, number> | null;
  flagged_anomalies: Record<string, number> | null;
}

/** Shape of the POST /api/v1/images/{image_id}/discard response body. */
export interface DiscardResponse {
  image_id: string;
  status: ImageStatus;
  discarded_at: string | null;
}

/**
 * The shape of a WatermelonDB AnalysisResult model's ai_findings getter.
 * Particle names come from the AI Engineer's InferenceResult contract.
 */
export interface AIFindings {
  RBC: number;
  WBC: number;
  Epithelial: number;
  Bacteria: number;
  Crystals: number;
  Casts: number;
  [particle: string]: number;
}
