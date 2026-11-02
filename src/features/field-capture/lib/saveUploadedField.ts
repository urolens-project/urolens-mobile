import { Q } from '@nozbe/watermelondb';

import { database } from '@db/database';
import { PendingSyncAction, PendingSyncStatus, ResultStatus } from '@app-types/enums';
import type AnalysisResult from '@db/models/AnalysisResult';
import type ResultField from '@db/models/ResultField';
import type FieldDetection from '@db/models/FieldDetection';
import type PendingSync from '@db/models/PendingSync';

import type { CapturedField, FieldAnalysisResponseDto, Magnification } from '../types';

/**
 * @description Get-or-creates the specimen's analysis_results row in CAPTURING — the
 * first field of a specimen creates it, exactly as the backend does. Must run inside
 * an active database.write().
 * @param specimenId - Server specimen id.
 * @param resultId - Server result id from the capture response.
 */
async function upsertCapturingResult(specimenId: string, resultId: string): Promise<void> {
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
    return;
  }

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

/**
 * @description Writes (or overwrites) a field's AI boxes into field_detections. Must
 * run inside an active database.write().
 * @param localFieldId - Local WatermelonDB id of the result_fields row.
 * @param detections - AI boxes from the capture response.
 * @param imageWidth - Width of the upright stored image the boxes refer to.
 * @param imageHeight - Height of the upright stored image the boxes refer to.
 */
async function writeFieldDetections(
  localFieldId: string,
  detections: FieldAnalysisResponseDto['detections'],
  imageWidth: number,
  imageHeight: number,
): Promise<void> {
  const detectionsJson = JSON.stringify(detections ?? []);
  const existing = await database
    .get<FieldDetection>('field_detections')
    .query(Q.where('field_id', localFieldId))
    .fetch();

  if (existing.length > 0) {
    await existing[0].update((d) => {
      d.detectionsJson = detectionsJson;
      d.imageWidth = imageWidth;
      d.imageHeight = imageHeight;
    });
    return;
  }

  await database.get<FieldDetection>('field_detections').create((d) => {
    d.fieldId = localFieldId;
    d.detectionsJson = detectionsJson;
    d.imageWidth = imageWidth;
    d.imageHeight = imageHeight;
  });
}

function toCapturedField(
  localId: string,
  localImageUri: string,
  data: FieldAnalysisResponseDto,
): CapturedField {
  return {
    localId,
    fieldNo: data.fieldNo,
    magnification: data.magnification,
    status: data.status,
    aiFindings: data.aiFindings ?? {},
    detections: data.detections ?? [],
    imageWidth: data.imageWidth,
    imageHeight: data.imageHeight,
    smartDiagnosisPreview: data.smartDiagnosisPreview,
    smartDiagnosisUnavailable: data.smartDiagnosisUnavailable,
    localImageUri,
    acceptedFieldCount: data.acceptedFieldCount,
    minFields: data.minFields,
  };
}

/**
 * @description Writes a captured field's upload response into WatermelonDB immediately
 * (the online path — capture, upload, decide, all in one go): a new result_fields row,
 * the field's AI boxes into field_detections, and get-or-creates the specimen's
 * analysis_results row.
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
  return database.write(async () => {
    await upsertCapturingResult(specimenId, data.resultId);

    const field = await database.get<ResultField>('result_fields').create((f) => {
      f.serverId = data.fieldId;
      f.resultId = data.resultId;
      f.specimenId = specimenId;
      f.imageId = data.imageId;
      f.fieldNo = data.fieldNo;
      f.magnification = data.magnification;
      f.status = data.status;
      f.aiFindingsJson = JSON.stringify(data.aiFindings ?? {});
      f.effectiveCountsJson = JSON.stringify(data.aiFindings ?? {});
      f.confidenceScoresJson = JSON.stringify(data.confidenceScores ?? {});
      f.imageWidth = data.imageWidth;
      f.imageHeight = data.imageHeight;
      f.smartDiagnosisJson = data.smartDiagnosisPreview
        ? JSON.stringify(data.smartDiagnosisPreview)
        : null;
      f.smartDiagnosisUnavailable = data.smartDiagnosisUnavailable;
      f.localImageUri = localImageUri;
      f.version = 1;
      f.isSynced = true;
      f.createdAt = Date.now();
      f.syncedAt = new Date().toISOString();
    });

    await writeFieldDetections(field.id, data.detections, data.imageWidth, data.imageHeight);

    return toCapturedField(field.id, localImageUri, data);
  });
}

/**
 * @description Creates a local-only placeholder for a field captured while offline:
 * status PENDING_UPLOAD (a client-only value, never sent to or read from the server),
 * server_id null. Queued for upload via a pending_sync UPLOAD_IMAGE row keyed on this
 * row's local id (see pushChanges.ts) — there is no server id yet to key it on.
 * @param specimenId - Server specimen id the field belongs to.
 * @param magnification - Objective chosen on the camera view.
 * @param localImageUri - Local file path of the processed image.
 */
export async function createQueuedFieldUpload(
  specimenId: string,
  magnification: Magnification,
  localImageUri: string,
): Promise<string> {
  const fieldsCollection = database.get<ResultField>('result_fields');
  const existingCount = await fieldsCollection
    .query(Q.where('specimen_id', specimenId))
    .fetchCount();
  const createdAt = Date.now();

  let newFieldId = '';
  await database.write(async () => {
    const field = fieldsCollection.prepareCreate((f) => {
      f.serverId = null;
      f.resultId = '';
      f.specimenId = specimenId;
      f.imageId = null;
      // Provisional — the server assigns the real number on upload; corrected
      // in applyFieldCaptureResponse once it responds.
      f.fieldNo = existingCount + 1;
      f.magnification = magnification;
      f.status = 'PENDING_UPLOAD';
      f.aiFindingsJson = '{}';
      f.effectiveCountsJson = '{}';
      f.confidenceScoresJson = '{}';
      f.imageWidth = 0;
      f.imageHeight = 0;
      f.smartDiagnosisJson = null;
      f.smartDiagnosisUnavailable = false;
      f.localImageUri = localImageUri;
      f.version = 0;
      f.isSynced = false;
      f.createdAt = createdAt;
      f.syncedAt = null;
    });
    newFieldId = field.id;

    // Queued on the field's own local id, not a server id — there isn't one
    // yet. Committed in the same batch as the field row so a queued upload
    // can never exist without the field it's for, or vice versa.
    const pending = database.get<PendingSync>('pending_sync').prepareCreate((row) => {
      row.entity = 'result_field';
      row.entityId = field.id;
      row.action = PendingSyncAction.UPLOAD_IMAGE;
      row.payloadJson = '{}';
      row.status = PendingSyncStatus.PENDING;
      row.createdAt = createdAt;
    });

    await database.batch(field, pending);
  });

  return newFieldId;
}

/**
 * @description Resolves a queued field the engine's input gate refused outright
 * (IMAGE_NOT_MICROSCOPY / IMAGE_EXPOSURE) — marks it DISCARDED with the reason, so
 * it comes off the field list's backlog instead of sitting stuck with no further
 * action possible (there is no server id to retry or discard it through).
 * @param localFieldId - Local WatermelonDB id of the PENDING_UPLOAD placeholder row.
 * @param reason - The engine's retake instruction, shown as the discard reason.
 */
export async function discardQueuedField(localFieldId: string, reason: string): Promise<void> {
  await database.write(async () => {
    const field = await database.get<ResultField>('result_fields').find(localFieldId);
    await field.update((f) => {
      f.status = 'DISCARDED';
      f.discardReason = reason;
      f.isSynced = true;
      f.syncedAt = new Date().toISOString();
    });
  });
}

/**
 * @description Turns a PENDING_UPLOAD placeholder into a real, decidable field once its
 * queued upload succeeds (the offline-replay path, run from pushChanges.ts) — same
 * shape of write as saveUploadedField, but an update of the existing local row rather
 * than a fresh create, since the row (and its local image) already exists.
 * @param localFieldId - Local WatermelonDB id of the placeholder result_fields row.
 * @param specimenId - Server specimen id the field belongs to.
 * @param data - Response from POST /fields.
 */
export async function applyFieldCaptureResponse(
  localFieldId: string,
  specimenId: string,
  data: FieldAnalysisResponseDto,
): Promise<void> {
  await database.write(async () => {
    await upsertCapturingResult(specimenId, data.resultId);

    const field = await database.get<ResultField>('result_fields').find(localFieldId);
    await field.update((f) => {
      f.serverId = data.fieldId;
      f.resultId = data.resultId;
      f.imageId = data.imageId;
      f.fieldNo = data.fieldNo;
      f.status = data.status;
      f.aiFindingsJson = JSON.stringify(data.aiFindings ?? {});
      f.effectiveCountsJson = JSON.stringify(data.aiFindings ?? {});
      f.confidenceScoresJson = JSON.stringify(data.confidenceScores ?? {});
      f.imageWidth = data.imageWidth;
      f.imageHeight = data.imageHeight;
      f.smartDiagnosisJson = data.smartDiagnosisPreview
        ? JSON.stringify(data.smartDiagnosisPreview)
        : null;
      f.smartDiagnosisUnavailable = data.smartDiagnosisUnavailable;
      f.version = 1;
      f.isSynced = true;
      f.syncedAt = new Date().toISOString();
    });

    await writeFieldDetections(localFieldId, data.detections, data.imageWidth, data.imageHeight);
  });
}
