import { Q } from '@nozbe/watermelondb';

import { database } from '../database';
import type AnalysisResult from '../models/AnalysisResult';
import type ResultField from '../models/ResultField';
import type FieldDetection from '../models/FieldDetection';

// Once a result reaches one of these, the MedTech's phone has nothing left to
// show for it — correction and confirmation both happened on the website, if
// this was a multi-field result at all. SDD Module 2 proposal, section 8:
// captured field images and boxes are kept on the device only until then.
const FINISHED_STATUSES = [
  'PENDING_SUPERVISOR_APPROVAL',
  'APPROVED',
  'RELEASED',
  'CRITICAL_ESCALATED',
];

/**
 * @description Frees a finished result's field images and AI boxes from local storage
 * (SDD Module 2 proposal, section 8) — run after every pull, a no-op once a result's
 * fields are already clean. Clears result_fields.local_image_uri (the file itself lives
 * in Expo's reclaimable cache directory, not somewhere this app writes outside of) and
 * deletes the matching field_detections row, which can hold up to 1,000 boxes per field.
 *
 * Deliberately does not also run on logout: unlike this, logout here intentionally
 * keeps a MedTech's offline work intact across the same user logging back in (see
 * claimLocalData.ts) — a field's local image is routine, bounded storage, not a
 * correctness concern the way an unsent change would be, so it isn't worth special-
 * casing logout to clear it early (see docs/multifield-open-decisions.md, #4).
 * Must run inside an active database.write().
 */
export async function cleanUpFinishedFields(): Promise<void> {
  const finishedResults = await database
    .get<AnalysisResult>('analysis_results')
    .query(Q.where('status', Q.oneOf(FINISHED_STATUSES)))
    .fetch();
  const finishedServerIds = finishedResults
    .map((r) => r.serverId)
    .filter((id): id is string => !!id);
  if (finishedServerIds.length === 0) return;

  const fields = await database
    .get<ResultField>('result_fields')
    .query(Q.where('result_id', Q.oneOf(finishedServerIds)))
    .fetch();
  const withLocalData = fields.filter((f) => f.localImageUri !== null);
  if (withLocalData.length === 0) return;

  const detections = await database
    .get<FieldDetection>('field_detections')
    .query(Q.where('field_id', Q.oneOf(withLocalData.map((f) => f.id))))
    .fetch();

  await database.batch(
    ...withLocalData.map((f) =>
      f.prepareUpdate((row) => {
        row.localImageUri = null;
      }),
    ),
    ...detections.map((d) => d.prepareDestroyPermanently()),
  );
}
