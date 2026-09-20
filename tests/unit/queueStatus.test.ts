import { getQueueStatus, orderByStatus } from '../../src/features/queue/status';

type Sample = Parameters<typeof getQueueStatus>[0] & { id: string; receivedAt: string };

const sample = (
  id: string,
  status: string,
  isReturnedForCorrection = false,
  receivedAt = '2026-09-20T00:00:00Z',
): Sample => ({ id, status: status as Sample['status'], isReturnedForCorrection, receivedAt });

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
