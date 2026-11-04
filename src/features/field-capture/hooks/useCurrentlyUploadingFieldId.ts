import { useEffect, useState } from 'react';

import {
  getCurrentlyUploadingFieldId,
  subscribeCurrentlyUploadingField,
} from '@db/sync/uploadStatus';

/**
 * @description Live local field id of the UPLOAD_IMAGE action pushChanges is
 * currently awaiting, or null while none is in flight — lets the field list and
 * thumbnail stack show "Uploading…" on the one row actually in flight, distinct
 * from the rest still waiting their turn in the same queue.
 */
export function useCurrentlyUploadingFieldId(): string | null {
  const [fieldId, setFieldId] = useState<string | null>(getCurrentlyUploadingFieldId);

  useEffect(
    (): (() => void) =>
      subscribeCurrentlyUploadingField((): void => setFieldId(getCurrentlyUploadingFieldId())),
    [],
  );

  return fieldId;
}
