import { Q } from '@nozbe/watermelondb';

import { database } from '@db/database';
import { ResultStatus } from '@app-types/enums';
import type AnalysisResult from '@db/models/AnalysisResult';
import type ResultField from '@db/models/ResultField';
import type FieldDetection from '@db/models/FieldDetection';

import type { CapturedField, FieldAnalysisResponseDto } from '../types';

/**
 * @description Writes a captured field's upload response into WatermelonDB immediately:
 * a new result_fields row every time (fields are never overwritten, unlike the
 * single-image workflow's retake-reuses-the-row behavior), the field's AI boxes into
 * field_detections, and get-or-creates the specimen's analysis_results row — the first
 * field of a specimen creates it in CAPTURING, exactly as the backend does.
 * @param specimenId - Server specimen id the field belongs to.
 * @param localImageUri - Local file path of the processed image, so the field shows
 * its own photo offline without a signed URL round trip.
 * @param data - Response from POST /fields.
 */
export async function saveUploadedField(
  specimenId: string,
  localImageUri: string,
  data: FieldAnalysisResponseDto,
): Promise<CapturedField> {
  const {
    fieldId,
    fieldNo,
    magnification,
    resultId,
    imageId,
    status,
    aiFindings,
    detections,
    imageWidth,
    imageHeight,
    confidenceScores,
    smartDiagnosisPreview,
    smartDiagnosisUnavailable,
    acceptedFieldCount,
    minFields,
  } = data;

  return database.write(async () => {
    const results = database.get<AnalysisResult>('analysis_results');
    const existingResult = await results.query(Q.where('specimen_id', specimenId)).fetch();

    if (existingResult.length > 0) {
      // Capturing a field only ever succeeds while the result is absent or
      // CAPTURING server-side (RESULT_NOT_EDITABLE otherwise), so it's safe to
      // set this unconditionally — the response doesn't carry the result's own
      // status, only the field's.
      await existingResult[0].update((r) => {
        r.serverId = resultId;
        r.status = ResultStatus.CAPTURING;
        r.isSynced = false;
        r.syncedAt = new Date().toISOString();
      });
    } else {
      await results.create((r) => {
        r.serverId = resultId;
        r.specimenId = specimenId;
        r.imageId = null;
        r.status = ResultStatus.CAPTURING;
        r.aiFindingsJson = '{}';
        r.smartDiagnosisJson = null;
        r.smartDiagnosisUnavailable = false;
        r.isSynced = false;
        r.createdAt = Date.now();
        r.syncedAt = new Date().toISOString();
        r.fieldCount = 0;
        r.fieldSummaryJson = null;
      });
    }

    const fieldsCollection = database.get<ResultField>('result_fields');
    const field = await fieldsCollection.create((f) => {
      f.serverId = fieldId;
      f.resultId = resultId;
      f.specimenId = specimenId;
      f.imageId = imageId;
      f.fieldNo = fieldNo;
      f.magnification = magnification;
      f.status = status;
      f.aiFindingsJson = JSON.stringify(aiFindings ?? {});
      f.effectiveCountsJson = JSON.stringify(aiFindings ?? {});
      f.confidenceScoresJson = JSON.stringify(confidenceScores ?? {});
      f.imageWidth = imageWidth;
      f.imageHeight = imageHeight;
      f.smartDiagnosisJson = smartDiagnosisPreview ? JSON.stringify(smartDiagnosisPreview) : null;
      f.smartDiagnosisUnavailable = smartDiagnosisUnavailable;
      f.localImageUri = localImageUri;
      f.version = 1;
      f.isSynced = true;
      f.createdAt = Date.now();
      f.syncedAt = new Date().toISOString();
    });

    await database.get<FieldDetection>('field_detections').create((d) => {
      d.fieldId = field.id;
      d.detectionsJson = JSON.stringify(detections ?? []);
      d.imageWidth = imageWidth;
      d.imageHeight = imageHeight;
    });

    return {
      localId: field.id,
      fieldNo,
      magnification,
      aiFindings: aiFindings ?? {},
      detections: detections ?? [],
      imageWidth,
      imageHeight,
      smartDiagnosisPreview,
      smartDiagnosisUnavailable,
      localImageUri,
      acceptedFieldCount,
      minFields,
    };
  });
}
