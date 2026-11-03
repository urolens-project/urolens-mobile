/**
 * getSubmitBlockingReason — mirrors the backend's guard order (mobile-n8-todo-rem.md
 * M6): offline, then still-sending, then undecided fields, then below minimum, then
 * none. Checked in this order because the server would still see a still-queued
 * decision as undecided even once the phone shows it resolved (mobile PR #55 review,
 * 3.6) — racing Submit against the queue drain must surface the clearer "sending"
 * message, not a confusing 409 later.
 */
import { getSubmitBlockingReason } from '../../src/features/field-capture/lib/submitBlockingReason';
import { FIELD_CAPTURE_TEXT } from '../../src/features/field-capture/constants/fieldCaptureText.constant';

const BASE = {
  acceptedCount: 10,
  minFields: 10,
  undecidedCount: 0,
  pendingDecisionsCount: 0,
  isOnline: true,
};

describe('getSubmitBlockingReason', () => {
  it('returns null once nothing blocks submission', () => {
    expect(getSubmitBlockingReason(BASE)).toBeNull();
  });

  it('blocks on offline first, even if other reasons also apply', () => {
    expect(
      getSubmitBlockingReason({
        ...BASE,
        isOnline: false,
        pendingDecisionsCount: 1,
        undecidedCount: 1,
        acceptedCount: 0,
      }),
    ).toBe(FIELD_CAPTURE_TEXT.submitOfflineBlockedMessage);
  });

  it('blocks on still-sending before undecided and below-minimum', () => {
    expect(
      getSubmitBlockingReason({
        ...BASE,
        pendingDecisionsCount: 1,
        undecidedCount: 1,
        acceptedCount: 0,
      }),
    ).toBe(FIELD_CAPTURE_TEXT.sendingDecisionsBlockedMessage);
  });

  it('blocks on undecided fields before below-minimum, counting PENDING_UPLOAD via pendingDecisionsCount already resolved', () => {
    expect(
      getSubmitBlockingReason({
        ...BASE,
        undecidedCount: 2,
        acceptedCount: 0,
      }),
    ).toBe(FIELD_CAPTURE_TEXT.undecidedFieldsBlockedMessage(2));
  });

  it('blocks on below-minimum only once nothing else applies', () => {
    expect(getSubmitBlockingReason({ ...BASE, acceptedCount: 7, minFields: 10 })).toBe(
      FIELD_CAPTURE_TEXT.belowMinimumBlockedMessage(7, 10),
    );
  });

  it('allows submission right at the minimum', () => {
    expect(getSubmitBlockingReason({ ...BASE, acceptedCount: 10, minFields: 10 })).toBeNull();
  });
});
