import { create } from 'zustand';

import { DEFAULT_MIN_FIELDS } from '@lib/constants/fieldCapture.constant';

interface MinFieldsState {
  minFields: number;
  setMinFields: (value: number) => void;
}

/**
 * @description The server's accepted-fields minimum (`GET /sync/pull`'s top-level
 * `minFields`, backend #105), read by every screen that shows a specimen's field
 * progress before a capture session's own response has supplied it. Starts at — and
 * falls back to — `DEFAULT_MIN_FIELDS` until the first sync that carries the key (only
 * present while `FIELD_WORKFLOW_ENABLED` is on server-side).
 */
export const useMinFieldsStore = create<MinFieldsState>((set) => ({
  minFields: DEFAULT_MIN_FIELDS,
  setMinFields: (value): void => set({ minFields: value }),
}));

/** @description Non-React access, for sync code outside a component. */
export function getMinFields(): number {
  return useMinFieldsStore.getState().minFields;
}
