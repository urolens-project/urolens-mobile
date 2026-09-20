import {
  getRejectBlockedReason,
  getSampleActions,
  getSampleStatusLabel,
} from '../../src/features/queue/lib/sampleState';
import type { ResultStatus, SpecimenStatus } from '../../src/types/enums';

type ResultState = `${ResultStatus}` | null;

describe('getSampleActions', () => {
  describe('Begin Analysis', () => {
    it.each<SpecimenStatus>(['ASSIGNED', 'IN_QUEUE', 'PROCESSING'])(
      'is offered for a %s specimen with no result yet',
      (status) => {
        expect(getSampleActions(status, null).canBeginAnalysis).toBe(true);
      },
    );

    // Bug: a rejected specimen showed both its rejection and a "Begin Analysis" button.
    it.each<SpecimenStatus>(['REJECTED', 'COMPLETED', 'RECEIVED', 'LABELED'])(
      'is NOT offered for a %s specimen',
      (status) => {
        expect(getSampleActions(status, null).canBeginAnalysis).toBe(false);
      },
    );

    it('is not offered once a result exists', () => {
      expect(getSampleActions('PROCESSING', 'PENDING_CONFIRM').canBeginAnalysis).toBe(false);
    });
  });

  describe('Reject Specimen', () => {
    it.each<[SpecimenStatus, ResultState]>([
      ['ASSIGNED', null],
      ['PROCESSING', null],
      ['PROCESSING', 'PENDING_CONFIRM'],
    ])("is offered while the specimen is still in the MedTech's hands (%s, %s)", (s, r) => {
      expect(getSampleActions(s, r).canReject).toBe(true);
    });

    // Bug: Reject stayed visible after confirmation, return and escalation.
    it.each<ResultState>([
      'PENDING_SUPERVISOR_APPROVAL',
      'RETURNED_FOR_CORRECTION',
      'CRITICAL_ESCALATED',
      'APPROVED',
      'RELEASED',
    ])('is NOT offered once the result is %s', (resultStatus) => {
      expect(getSampleActions('ASSIGNED', resultStatus).canReject).toBe(false);
    });

    it.each<SpecimenStatus>(['REJECTED', 'COMPLETED'])('is NOT offered for a %s specimen', (s) => {
      expect(getSampleActions(s, null).canReject).toBe(false);
    });
  });

  describe('Confirm and Retake', () => {
    it("offers both while the result awaits the MedTech's confirmation", () => {
      const actions = getSampleActions('PROCESSING', 'PENDING_CONFIRM');
      expect(actions.canConfirm).toBe(true);
      expect(actions.canRetake).toBe(true);
    });

    it('offers only Retake after the Supervisor returns the result', () => {
      const actions = getSampleActions('ASSIGNED', 'RETURNED_FOR_CORRECTION');
      expect(actions.canConfirm).toBe(false);
      expect(actions.canRetake).toBe(true);
    });

    // A rejected specimen's result must never be confirmed or sent to the Supervisor.
    it('offers neither for a rejected specimen, even with a result awaiting confirmation', () => {
      const actions = getSampleActions('REJECTED', 'PENDING_CONFIRM');
      expect(actions.canConfirm).toBe(false);
      expect(actions.canRetake).toBe(false);
    });

    it.each<ResultState>([
      'PENDING_SUPERVISOR_APPROVAL',
      'CRITICAL_ESCALATED',
      'APPROVED',
      'RELEASED',
    ])('offers neither once the result is %s', (resultStatus) => {
      const actions = getSampleActions('ASSIGNED', resultStatus);
      expect(actions.canConfirm).toBe(false);
      expect(actions.canRetake).toBe(false);
    });
  });
});

describe('getRejectBlockedReason', () => {
  it('is null when the specimen can be rejected', () => {
    expect(getRejectBlockedReason('ASSIGNED', null)).toBeNull();
    expect(getRejectBlockedReason('PROCESSING', 'PENDING_CONFIRM')).toBeNull();
  });

  it('explains an already-rejected specimen', () => {
    expect(getRejectBlockedReason('REJECTED', null)).toMatch(/already been rejected/);
  });

  it('explains a result that has been handed to the Supervisor, and what to do instead', () => {
    const reason = getRejectBlockedReason('ASSIGNED', 'PENDING_SUPERVISOR_APPROVAL');
    expect(reason).toMatch(/submitted for supervisor review/);
    expect(reason).toMatch(/return the result/);
  });

  it('agrees with canReject for every combination', () => {
    const specimens: SpecimenStatus[] = [
      'RECEIVED',
      'LABELED',
      'ASSIGNED',
      'IN_QUEUE',
      'PROCESSING',
      'REJECTED',
      'COMPLETED',
    ];
    const results: ResultState[] = [
      null,
      'PENDING_CONFIRM',
      'PENDING_SUPERVISOR_APPROVAL',
      'APPROVED',
      'RELEASED',
      'RETURNED_FOR_CORRECTION',
      'CRITICAL_ESCALATED',
    ];
    for (const s of specimens) {
      for (const r of results) {
        expect(getSampleActions(s, r).canReject).toBe(getRejectBlockedReason(s, r) === null);
      }
    }
  });
});

describe('getSampleStatusLabel', () => {
  it("uses the Queue's wording for the specimen statuses", () => {
    expect(getSampleStatusLabel('PROCESSING', null)).toBe('In Progress');
    expect(getSampleStatusLabel('ASSIGNED', null)).toBe('Assigned');
  });

  // Bug: only the first underscore was replaced, and the raw enum was shown.
  it('turns every underscore into a space and title-cases', () => {
    expect(getSampleStatusLabel('IN_QUEUE', null)).toBe('In Queue');
    expect(getSampleStatusLabel('ASSIGNED', 'PENDING_SUPERVISOR_APPROVAL')).toBe(
      'Pending Supervisor Approval',
    );
  });

  it("shows how far the result has got, not the specimen's stale status", () => {
    expect(getSampleStatusLabel('ASSIGNED', 'RETURNED_FOR_CORRECTION')).toBe(
      'Returned for Correction',
    );
    expect(getSampleStatusLabel('ASSIGNED', 'CRITICAL_ESCALATED')).toBe('Critical / Escalated');
    expect(getSampleStatusLabel('COMPLETED', 'APPROVED')).toBe('Approved');
    expect(getSampleStatusLabel('COMPLETED', 'RELEASED')).toBe('Released');
  });

  it('a rejected specimen is Rejected whatever its result says', () => {
    expect(getSampleStatusLabel('REJECTED', 'PENDING_CONFIRM')).toBe('Rejected');
  });

  it('falls back to the specimen status when the result is still with the MedTech', () => {
    expect(getSampleStatusLabel('PROCESSING', 'PENDING_CONFIRM')).toBe('In Progress');
  });
});
