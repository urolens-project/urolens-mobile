import {
  countByQueueStatus,
  getProceedAction,
  getQueueStatus,
  orderByStatus,
} from '../../src/features/queue/status';

type Sample = Parameters<typeof getQueueStatus>[0] & { id: string; receivedAt: string };

const sample = (
  id: string,
  status: string,
  isReturnedForCorrection = false,
  receivedAt = '2026-09-20T00:00:00Z',
  resultStatus: string | null = null,
): Sample => ({
  id,
  status: status as Sample['status'],
  isReturnedForCorrection,
  receivedAt,
  resultStatus,
});

describe('getQueueStatus', () => {
  it.each([
    ['ASSIGNED', false, 'ASSIGNED'],
    ['PROCESSING', false, 'PROCESSING'],
    ['COMPLETED', false, null],
    ['REJECTED', false, null],
  ])('%s (returned: %s) → %s', (status, returned, expected) => {
    expect(getQueueStatus(sample('x', status, returned))).toBe(expected);
  });

  // A returned sample is a Returned sample, whatever its specimen says.
  it.each(['ASSIGNED', 'PROCESSING', 'COMPLETED'])(
    'a returned sample is RETURNED even when the specimen is %s',
    (status) => {
      expect(getQueueStatus(sample('x', status, true))).toBe('RETURNED');
    },
  );

  it('a CAPTURING result is CAPTURING whatever the specimen status', () => {
    expect(getQueueStatus(sample('x', 'ASSIGNED', false, undefined, 'CAPTURING'))).toBe(
      'CAPTURING',
    );
  });

  // Status alone decides VERIFYING, legacy single-image or multi-field alike
  // (mobile PR #55 review, #3) — field count no longer matters.
  it.each(['PENDING_CONFIRM', 'IMAGE_RETAKE_REQUESTED', 'FAILED'])(
    'a %s result is VERIFYING whatever the field count',
    (resultStatus) => {
      expect(getQueueStatus(sample('x', 'PROCESSING', false, undefined, resultStatus))).toBe(
        'VERIFYING',
      );
    },
  );

  // A RETURNED_FOR_CORRECTION result still ranks as RETURNED, not VERIFYING — the
  // mapper sets isReturnedForCorrection whenever this resultStatus occurs, and that
  // flag has to win even though the result is otherwise read-only on mobile.
  it('a RETURNED_FOR_CORRECTION result is RETURNED, not VERIFYING', () => {
    expect(
      getQueueStatus(sample('x', 'PROCESSING', true, undefined, 'RETURNED_FOR_CORRECTION')),
    ).toBe('RETURNED');
  });

  // mobile-queue-status-n8, Q1: the website's Capture More Fields reopens a
  // returned result back to CAPTURING. It still needs the MedTech, so it has
  // to keep ranking as RETURNED, not CAPTURING, until it's resubmitted.
  it('a reopened return (CAPTURING, isReturnedForCorrection) is RETURNED, not CAPTURING', () => {
    expect(getQueueStatus(sample('x', 'PROCESSING', true, undefined, 'CAPTURING'))).toBe(
      'RETURNED',
    );
  });

  it('a CAPTURING result without an open return is still CAPTURING', () => {
    expect(getQueueStatus(sample('x', 'PROCESSING', false, undefined, 'CAPTURING'))).toBe(
      'CAPTURING',
    );
  });

  // mobile-queue-status-n8, Q2: nothing sets IN_QUEUE today, but older rows may
  // have it, and the backend treats it as startable work same as ASSIGNED.
  it('IN_QUEUE counts as ASSIGNED', () => {
    expect(getQueueStatus(sample('x', 'IN_QUEUE'))).toBe('ASSIGNED');
  });
});

// mobile-queue-status-n8, Q1: a returned sample reads Continue Capturing once the
// website's Capture More Fields has reopened it, and Continue on the website
// until then (not reopened, i.e. result is still RETURNED_FOR_CORRECTION).
describe('getProceedAction', () => {
  it('a returned sample whose result is CAPTURING offers Continue Capturing', () => {
    expect(getProceedAction('RETURNED', 'CAPTURING')).toBe('CONTINUE_CAPTURING');
  });

  it('a returned sample whose result is RETURNED_FOR_CORRECTION says Continue on the website', () => {
    expect(getProceedAction('RETURNED', 'RETURNED_FOR_CORRECTION')).toBe('CONTINUE_ON_WEBSITE');
  });

  it('a CAPTURING sample (not returned) offers Continue Capturing', () => {
    expect(getProceedAction('CAPTURING', 'CAPTURING')).toBe('CONTINUE_CAPTURING');
  });

  it.each(['PROCESSING', 'VERIFYING'] as const)('%s offers Continue', (status) => {
    expect(getProceedAction(status, null)).toBe('CONTINUE');
  });

  it('ASSIGNED offers Proceed to Analysis', () => {
    expect(getProceedAction('ASSIGNED', null)).toBe('PROCEED_TO_ANALYSIS');
  });

  it('no Queue status offers Proceed to Analysis', () => {
    expect(getProceedAction(null, null)).toBe('PROCEED_TO_ANALYSIS');
  });
});

describe('countByQueueStatus', () => {
  it('counts each status, including Capturing', () => {
    const items = [
      sample('capturing', 'PROCESSING', false, undefined, 'CAPTURING'),
      sample('verifying', 'PROCESSING', false, undefined, 'PENDING_CONFIRM'),
      sample('progressing', 'PROCESSING'),
      sample('assigned', 'ASSIGNED'),
      sample('returned', 'ASSIGNED', true),
      sample('done', 'COMPLETED'),
    ];
    expect(countByQueueStatus(items)).toEqual({
      RETURNED: 1,
      CAPTURING: 1,
      PROCESSING: 1,
      ASSIGNED: 1,
      VERIFYING: 1,
    });
  });

  it('counts nothing for an empty list', () => {
    expect(countByQueueStatus([])).toEqual({
      RETURNED: 0,
      CAPTURING: 0,
      PROCESSING: 0,
      ASSIGNED: 0,
      VERIFYING: 0,
    });
  });
});

describe('orderByStatus', () => {
  it('orders Returned, then In Progress, then Assigned', () => {
    const ordered = orderByStatus([
      sample('assigned', 'ASSIGNED'),
      sample('progress', 'PROCESSING'),
      sample('returned', 'ASSIGNED', true),
    ]);
    expect(ordered.map((s) => s.id)).toEqual(['returned', 'progress', 'assigned']);
  });

  it('puts the newest first within a status', () => {
    const ordered = orderByStatus([
      sample('old', 'ASSIGNED', false, '2026-09-01T00:00:00Z'),
      sample('new', 'ASSIGNED', false, '2026-09-20T00:00:00Z'),
      sample('mid', 'ASSIGNED', false, '2026-09-10T00:00:00Z'),
    ]);
    expect(ordered.map((s) => s.id)).toEqual(['new', 'mid', 'old']);
  });

  it('sorts a returned sample above an In Progress one even if it arrived earlier', () => {
    const ordered = orderByStatus([
      sample('progress', 'PROCESSING', false, '2026-09-20T00:00:00Z'),
      sample('returned', 'ASSIGNED', true, '2026-05-01T00:00:00Z'),
    ]);
    expect(ordered[0].id).toBe('returned');
  });

  it('puts anything without a Queue status last', () => {
    const ordered = orderByStatus([sample('done', 'COMPLETED'), sample('assigned', 'ASSIGNED')]);
    expect(ordered.map((s) => s.id)).toEqual(['assigned', 'done']);
  });

  it('does not change the array it was given', () => {
    const input = [sample('a', 'ASSIGNED'), sample('b', 'PROCESSING')];
    orderByStatus(input);
    expect(input.map((s) => s.id)).toEqual(['a', 'b']);
  });

  it('tolerates an unparseable date', () => {
    const ordered = orderByStatus([
      sample('bad', 'ASSIGNED', false, 'not a date'),
      sample('good', 'ASSIGNED', false, '2026-09-20T00:00:00Z'),
    ]);
    expect(ordered.map((s) => s.id)).toEqual(['good', 'bad']);
  });
});
