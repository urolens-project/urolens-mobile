/**
 * mapFailedActionToUi: how a refused queued change is listed on Profile (UROLENS-220).
 *
 * Covers: a title per action, the server's reason without its error code, the sample
 * passed through, and fallbacks for an unknown action or a missing reason.
 */

import type PendingSync from '../../src/db/models/PendingSync';
import { mapFailedActionToUi } from '../../src/features/profile/mappers/failedAction.mapper';
import { PendingSyncAction } from '../../src/types/enums';

function item(overrides: Partial<PendingSync> = {}): PendingSync {
  return {
    id: 'q1',
    action: PendingSyncAction.CONFIRM_RESULT,
    errorMessage: 'RESULT_NOT_EDITABLE: This result can no longer be changed.',
    ...overrides,
  } as PendingSync;
}

describe('mapFailedActionToUi', () => {
  it('lists what was tried, on which sample, and why it was refused', () => {
    expect(mapFailedActionToUi(item(), 'SMP-20261003-00001')).toEqual({
      id: 'q1',
      title: 'Confirm result',
      sampleUid: 'SMP-20261003-00001',
      reason: 'This result can no longer be changed.',
    });
  });

  it.each([
    [PendingSyncAction.REJECT_SPECIMEN, 'Reject specimen'],
    [PendingSyncAction.START_ANALYSIS, 'Begin analysis'],
    [PendingSyncAction.CONFIRM_RESULT, 'Confirm result'],
    [PendingSyncAction.OVERRIDE_PARAMETER, 'Correct a value'],
    [PendingSyncAction.DISCARD_IMAGE, 'Discard image'],
    ['SOMETHING_NEW', 'Change'],
  ])('%s is titled "%s"', (action, title) => {
    expect(mapFailedActionToUi(item({ action }), null).title).toBe(title);
  });

  it.each([
    [
      'SPECIMEN_NOT_ASSIGNED: This specimen is not assigned to you.',
      'This specimen is not assigned to you.',
    ],
    ['CONSENT_REFUSED: The patient refused processing.', 'The patient refused processing.'],
    ['A message with no code', 'A message with no code'],
    ['Note: keeps a lowercase prefix', 'Note: keeps a lowercase prefix'],
  ])('shows "%s" as "%s"', (errorMessage, reason) => {
    expect(mapFailedActionToUi(item({ errorMessage }), null).reason).toBe(reason);
  });

  it.each([null, '', 'UNKNOWN_ERROR: '])('falls back when the reason is %p', (errorMessage) => {
    expect(mapFailedActionToUi(item({ errorMessage }), null).reason).toBe(
      'The server did not accept this change.',
    );
  });

  it('passes through an unknown sample as null', () => {
    expect(mapFailedActionToUi(item(), null).sampleUid).toBeNull();
  });
});
