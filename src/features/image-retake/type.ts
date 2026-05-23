// src/features/image-retake/types.ts
/**
 * Domain types for the Image Capture & Retake feature (T2.7).
 */

/** Status values for the Image row — mirrors ImageStatus enum on the backend. */
export const ImageStatus = {
  UPLOADED: 'UPLOADED',
  PROCESSING: 'PROCESSING',
  PROCESSED: 'PROCESSED',
  FAILED: 'FAILED',
  DISCARDED: 'DISCARDED',
} as const;

export type ImageStatus = (typeof ImageStatus)[keyof typeof ImageStatus];

/** Shape of the POST /images/upload response body. */
export interface UploadResponse {
  id: string;          // AnalysisResult UUID
  specimen_id: string;
  image_id: string;
  status: string;      // ResultStatus
  ai_findings: Record<string, number> | null;
}

/** Shape of the POST /images/{id}/discard response body. */
export interface DiscardResponse {
  id: string;          // Image UUID
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
  [particle: string]: number;  // future particles
}