import { Q } from '@nozbe/watermelondb';

import { database } from '@db/database';
import type AnalysisResult from '@db/models/AnalysisResult';
import type ManualOverride from '@db/models/ManualOverride';
import type { UploadImageResponse } from '@lib/camera/uploadImage';

/**
 * @description Writes a fresh upload response into WatermelonDB immediately, so Sample
 * Detail shows the new result without waiting for the next background sync. Backend
 * reuses the same result_id on retake (UPDATE, not INSERT), so any manual overrides
 * left over from the previous AI findings are purged first.
 * @param specimenId - Local specimen id the result belongs to.
 * @param data - Response from the image upload endpoint.
 */
export async function saveUploadedResult(specimenId: string, data: UploadImageResponse): Promise<void> {
  // Backend: both `id` and `resultId` equal the analysis result UUID; `imageId` is the image UUID.
  const { id: serverResultId, imageId: uploadedImageId, status, aiFindings, smartDiagnosis } = data;

  await database.write(async () => {
    const collection = database.get<AnalysisResult>('analysis_results');
    const existing = await collection.query(Q.where('specimen_id', specimenId)).fetch();
    const findings = JSON.stringify(aiFindings ?? {});
    const diagnosisJson = smartDiagnosis ? JSON.stringify(smartDiagnosis) : null;

    if (existing.length > 0) {
      if (existing[0].serverId) {
        const staleOverrides = await database
          .get<ManualOverride>('manual_overrides')
          .query(Q.where('result_id', existing[0].serverId))
          .fetch();
        for (const o of staleOverrides) {
          await o.destroyPermanently();
        }
      }
      await existing[0].update((r) => {
        r.serverId = serverResultId;
        r.imageId = uploadedImageId ?? null;
        r.status = status;
        r.aiFindingsJson = findings;
        r.smartDiagnosisJson = diagnosisJson;
        r.smartDiagnosisUnavailable = false;
        r.isSynced = false;
        r.syncedAt = new Date().toISOString();
      });
    } else {
      await collection.create((r) => {
        r.serverId = serverResultId;
        r.specimenId = specimenId;
        r.imageId = uploadedImageId ?? null;
        r.status = status;
        r.aiFindingsJson = findings;
        r.smartDiagnosisJson = diagnosisJson;
        r.smartDiagnosisUnavailable = false;
        r.isSynced = false;
        r.createdAt = Date.now();
        r.syncedAt = new Date().toISOString();
      });
    }
  });
}
