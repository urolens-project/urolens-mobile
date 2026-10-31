import { File } from 'expo-file-system';

import { FIELDS_DIRECTORY } from '@lib/camera/imageUtils';

/**
 * @description Deletes one field's local image file, tolerating one that's already
 * gone (already cleaned up, or never downloaded). Previously this only cleared the
 * result_fields.local_image_uri pointer and left the file behind — harmless while it
 * sat in Expo's OS-reclaimable cache directory, but no longer true now that captured
 * images live in documentDirectory/fields/ (mobile PR #55 review, decision #4):
 * nothing else will ever reclaim that space, so the app must delete the file itself
 * for RA 10173 data minimisation.
 * @param uri - The field's local_image_uri, or null if it never had one.
 */
export function deleteFieldImageFile(uri: string | null | undefined): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (err) {
    console.error('[fieldFiles] failed to delete field image', uri, err);
  }
}

/**
 * @description Deletes every field image on the phone — the multi-field flow's and
 * the legacy single-image retake flow's alike, since both share this one folder (see
 * imageUtils.ts's FIELDS_DIRECTORY). Used when a different MedTech claims the local
 * database (claimLocalData.ts): the database wipe alone never touched these files.
 */
export function deleteAllFieldImages(): void {
  try {
    if (FIELDS_DIRECTORY.exists) FIELDS_DIRECTORY.delete();
  } catch (err) {
    console.error('[fieldFiles] failed to delete the fields directory', err);
  }
}
