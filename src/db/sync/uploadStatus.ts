// Transient, in-memory only: which field's UPLOAD_IMAGE action pushChanges is
// dispatching right now, for a live "Uploading…" vs "Waiting to upload…" distinction
// in the field list and thumbnail stack. Deliberately not persisted — on an app
// restart mid-upload this just resets to null, which is correct: the row itself is
// still PENDING_UPLOAD/PENDING and nothing claims it as "uploading" again until
// pushChanges actually redispatches it. Kept separate from pushChanges.ts's own
// retry/error bookkeeping, mirroring how syncManager.ts owns its own syncStatus.

let currentlyUploadingFieldId: string | null = null;
const listeners = new Set<() => void>();

/** @description The local result_fields id of the UPLOAD_IMAGE action pushChanges is
 * currently awaiting, or null while none is in flight. */
export function getCurrentlyUploadingFieldId(): string | null {
  return currentlyUploadingFieldId;
}

/** @description Sets the field currently being uploaded and notifies subscribers. */
export function setCurrentlyUploadingFieldId(id: string | null): void {
  currentlyUploadingFieldId = id;
  listeners.forEach((listener) => listener());
}

/** @description Registers a listener for changes to the currently-uploading field;
 * call the return value to unsubscribe. */
export function subscribeCurrentlyUploadingField(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
