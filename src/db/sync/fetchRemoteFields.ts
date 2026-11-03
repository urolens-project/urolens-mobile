/**
 * Background fetch of fields captured on another phone (SDD Module 2 proposal's
 * background-fetch proposal; mobile-n8-todo-rem.md C5). A CAPTURING result's fields
 * sync via `resultFields` on every pull, but never their AI boxes or image — those
 * come from here, one field at a time, only for the fields this device doesn't
 * already have.
 */
import { Q } from '@nozbe/watermelondb';
import { File } from 'expo-file-system';

import { apiClient } from '@lib/apiClient';
import { FIELDS_DIRECTORY } from '@lib/camera/imageUtils';
import { writeFieldDetections } from '@features/field-capture/lib/saveUploadedField';
import type { Detection } from '@db/models/FieldDetection';

import { database } from '../database';
import type AnalysisResult from '../models/AnalysisResult';
import type FieldDetection from '../models/FieldDetection';
import type ResultField from '../models/ResultField';

interface FieldDetailDto {
  detections: Detection[];
  imageWidth: number;
  imageHeight: number;
  imageUrl: string | null;
}

/**
 * @description Downloads `imageUrl` (a signed link, valid for one hour) into the
 * fields/ folder; returns null on failure so the caller can still save the boxes
 * without an image rather than losing the whole fetch.
 * @param url - Signed image URL from `GET /fields/{fieldId}`.
 * @param fieldServerId - Used as the stored filename, so a retry overwrites rather
 * than accumulating copies.
 */
async function downloadFieldImage(url: string, fieldServerId: string): Promise<string | null> {
  try {
    if (!FIELDS_DIRECTORY.exists) {
      FIELDS_DIRECTORY.create({ idempotent: true, intermediates: true });
    }
    const destination = new File(FIELDS_DIRECTORY, `field-${fieldServerId}.jpg`);
    const downloaded = await File.downloadFileAsync(url, destination, { idempotent: true });
    return downloaded.uri;
  } catch (err) {
    console.error('[fetchRemoteFields] failed to download image', fieldServerId, err);
    return null;
  }
}

/**
 * @description Fetches detections (and the image, best-effort) for every field of a
 * **CAPTURING** result that has neither a local `field_detections` row nor a local
 * image — a field captured on another phone, or before a reinstall. Never called for
 * `PENDING_CONFIRM` or `RETURNED_FOR_CORRECTION`: `GET /fields/{fieldId}` records the
 * "opened" mark the website's Mark as Checked depends on for those statuses, and this
 * fetch must never trigger that while the specimen is still being captured.
 *
 * One field's failure (network blip, 404) is logged and skipped, not fatal to the
 * rest — this is a best-effort background enhancement, not core sync data, so it
 * never fails the sync cycle it runs alongside.
 * @param signal - Aborts in-flight requests when the account changes mid-sync.
 */
export async function fetchRemoteFields(signal?: AbortSignal): Promise<void> {
  const capturingResults = await database
    .get<AnalysisResult>('analysis_results')
    .query(Q.where('status', 'CAPTURING'))
    .fetch();
  const resultIds = capturingResults.map((r) => r.serverId).filter((id): id is string => !!id);
  if (resultIds.length === 0) return;

  const fields = await database
    .get<ResultField>('result_fields')
    .query(Q.where('result_id', Q.oneOf(resultIds)))
    .fetch();
  const candidates = fields.filter((f) => f.serverId && !f.localImageUri);
  if (candidates.length === 0) return;

  const existingDetections = await database
    .get<FieldDetection>('field_detections')
    .query(Q.where('field_id', Q.oneOf(candidates.map((f) => f.id))))
    .fetch();
  const alreadyHasDetections = new Set(existingDetections.map((d) => d.fieldId));
  const toFetch = candidates.filter((f) => !alreadyHasDetections.has(f.id));

  for (const field of toFetch) {
    if (signal?.aborted) return;
    try {
      const { data } = await apiClient.get<FieldDetailDto>(`/fields/${field.serverId}`, { signal });
      const localImageUri = data.imageUrl
        ? await downloadFieldImage(data.imageUrl, field.serverId as string)
        : null;

      await database.write(async (): Promise<void> => {
        await writeFieldDetections(field.id, data.detections, data.imageWidth, data.imageHeight);
        if (localImageUri) {
          await field.update((f) => {
            f.localImageUri = localImageUri;
          });
        }
      });
    } catch (err) {
      console.error('[fetchRemoteFields] failed to fetch field', field.serverId, err);
    }
  }
}
