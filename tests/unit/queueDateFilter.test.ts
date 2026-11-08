/**
 * The Queue's Date filter, run against a real (in-memory LokiJS) WatermelonDB
 * rather than a mocked query builder — a nested OR/AND is only proven by the
 * rows it actually returns.
 *
 * Date = still in the Queue, AND (received today OR In Progress OR returned for
 * correction). In Progress / Returned samples stay visible whatever day they
 * arrived; anything finished or outside the Queue stays out.
 */

// tests/setup.ts mocks WatermelonDB for every test; this file needs the real thing.
jest.mock('@nozbe/watermelondb', () => jest.requireActual('@nozbe/watermelondb'));

// jest-expo resolves the React Native build of WatermelonDB's id helper, which needs
// the native bridge; a plain-JS id is all an in-memory database needs.
jest.mock('@nozbe/watermelondb/utils/common/randomId', () => ({
  __esModule: true,
  default: () => Math.random().toString(36).slice(2, 18).padEnd(16, '0'),
}));

jest.mock('@db/database', () => ({ database: {} }));
jest.mock('@db/sync/syncManager', () => ({ synchronize: jest.fn(), LAST_SYNC_KEY: 'k' }));
jest.mock('@hooks/useNetworkStatus', () => ({ useNetworkStatus: jest.fn() }));

import Loki from 'lokijs';
import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { schema } from '../../src/db/schema';
import Specimen from '../../src/db/models/Specimen';
import { buildQuery } from '../../src/features/queue/lib/queueQuery';
import { clinicDayRange } from '../../src/lib/dateTime';

// Server-style timestamps (what the backend syncs down): UTC with +00:00.
const serverTs = (d: Date) => d.toISOString().replace('Z', '+00:00');
const now = new Date();
const daysAgo = (n: number) => serverTs(new Date(now.getTime() - n * 24 * 60 * 60 * 1000));
const TODAY = serverTs(now);

let database: Database;

// The database library logs its setup steps; keep the test output readable.
beforeAll(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterAll(() => jest.restoreAllMocks());

async function seed(rows: Record<string, unknown>[]) {
  await database.write(async () => {
    for (const row of rows) {
      await database.get<Specimen>('specimens').create((s) => {
        Object.assign(s as unknown as Record<string, unknown>, {
          sampleUid: `SMP-${row.serverId}`,
          patientUid: `PT-${row.serverId}`,
          testType: 'Urinalysis',
          ...row,
        });
      });
    }
  });
}

async function run(
  filter:
    | 'DATE'
    | 'LATEST'
    | 'EARLIEST'
    | 'ALL'
    | 'ASSIGNED'
    | 'PROCESSING'
    | 'CAPTURING'
    | 'VERIFYING'
    | 'RETURNED',
  returned: string[] = [],
  finished: string[] = [],
) {
  const rows = await database
    .get<Specimen>('specimens')
    .query(...buildQuery(filter, returned, finished))
    .fetch();
  return rows.map((r) => r.serverId);
}

beforeEach(async () => {
  database = new Database({
    adapter: new LokiJSAdapter({
      schema,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `queue-date-${Math.random()}`,
      // Pure in-memory: no IndexedDB in Node, and no autosave timer to keep Jest open.
      ...({ _testLokiAdapter: new (Loki as any).LokiMemoryAdapter() } as object),
      extraLokiOptions: { autosave: false, verbose: false },
    }),
    modelClasses: [Specimen],
  });

  await seed([
    { serverId: 'today-assigned', status: 'ASSIGNED', receivedAt: TODAY },
    { serverId: 'today-processing', status: 'PROCESSING', receivedAt: TODAY },
    { serverId: 'old-assigned', status: 'ASSIGNED', receivedAt: daysAgo(8) },
    { serverId: 'old-processing', status: 'PROCESSING', receivedAt: daysAgo(8) },
    { serverId: 'old-returned', status: 'ASSIGNED', receivedAt: daysAgo(30) },
    { serverId: 'old-processing-finished', status: 'PROCESSING', receivedAt: daysAgo(3) },
    { serverId: 'today-completed', status: 'COMPLETED', receivedAt: TODAY },
  ]);
});

describe('Queue Date filter', () => {
  it('shows samples received today', async () => {
    expect(await run('DATE')).toContain('today-assigned');
  });

  it('keeps an In Progress sample visible even though it arrived on an earlier day', async () => {
    const ids = await run('DATE');
    expect(ids).toContain('old-processing');
    expect(ids).toContain('today-processing');
  });

  it('keeps a Returned sample visible even though it arrived on an earlier day', async () => {
    expect(await run('DATE', ['old-returned'])).toContain('old-returned');
  });

  it('hides an older Assigned sample that is not started or returned', async () => {
    const ids = await run('DATE', ['old-returned']);
    expect(ids).not.toContain('old-assigned');
  });

  it('still hides finished work, however it qualifies', async () => {
    // Confirmed and awaiting the Supervisor: nothing left for the MedTech.
    expect(await run('DATE', [], ['old-processing-finished'])).not.toContain(
      'old-processing-finished',
    );
  });

  it('does not bring back specimens outside the Queue', async () => {
    expect(await run('DATE')).not.toContain('today-completed');
  });

  it('returns exactly the expected set, newest first', async () => {
    const ids = await run('DATE', ['old-returned'], ['old-processing-finished']);
    expect([...ids].sort()).toEqual(
      ['old-processing', 'old-returned', 'today-assigned', 'today-processing'].sort(),
    );
    // Sorted by received_at desc: today's samples first, then 8 days ago, then 30.
    expect(ids.indexOf('old-processing')).toBeGreaterThan(ids.indexOf('today-assigned'));
    expect(ids.indexOf('old-processing')).toBeGreaterThan(ids.indexOf('today-processing'));
    expect(ids.indexOf('old-returned')).toBeGreaterThan(ids.indexOf('old-processing'));
  });
});

// mobile-queue-status-n8, Q2: nothing in the backend sets IN_QUEUE today, but older
// rows may have it, and it's startable work the same as ASSIGNED.
describe('IN_QUEUE is in the Queue scope', () => {
  it('shows an IN_QUEUE specimen under ALL', async () => {
    await seed([{ serverId: 'today-in-queue', status: 'IN_QUEUE', receivedAt: TODAY }]);
    expect(await run('ALL')).toContain('today-in-queue');
  });
});

describe('unchanged filters', () => {
  it('Latest and Earliest still show everything in the Queue, oldest included', async () => {
    const latest = await run('LATEST', ['old-returned'], ['old-processing-finished']);
    expect(latest).toEqual(
      expect.arrayContaining(['old-assigned', 'old-processing', 'old-returned']),
    );
    const earliest = await run('EARLIEST', ['old-returned'], ['old-processing-finished']);
    expect(earliest[0]).toBe('old-returned');
  });
});

// A status chip (mobile-queue-status-n8, Q3) no longer narrows the DB query — every
// chip loads the same Queue scope as ALL, and useQueue.ts (tested separately, with a
// mocked DB) keeps only the rows matching that chip's getQueueStatus in memory. This
// is what makes the chip, the counts, the badge and the sort unable to disagree:
// they all run the one rule, instead of the DB query duplicating it.
describe('a status chip loads the same Queue scope as ALL', () => {
  it.each(['ASSIGNED', 'PROCESSING', 'CAPTURING', 'VERIFYING', 'RETURNED'] as const)(
    '%s returns exactly what ALL returns',
    async (filter) => {
      const returned = ['old-returned'];
      const finished = ['old-processing-finished'];
      const all = await run('ALL', returned, finished);
      const chip = await run(filter, returned, finished);
      expect([...chip].sort()).toEqual([...all].sort());
    },
  );
});

// "Today" is the clinic's (Manila) day, whatever timezone the phone is set to.
describe('Date filter uses the clinic day', () => {
  it('includes a sample from just after Manila midnight and excludes one from just before', async () => {
    const midnight = new Date(clinicDayRange().start).getTime();
    await seed([
      {
        serverId: 'just-after-midnight',
        status: 'ASSIGNED',
        receivedAt: serverTs(new Date(midnight + 60_000)),
      },
      {
        serverId: 'just-before-midnight',
        status: 'ASSIGNED',
        receivedAt: serverTs(new Date(midnight - 60_000)),
      },
    ]);

    const ids = await run('DATE');
    expect(ids).toContain('just-after-midnight');
    expect(ids).not.toContain('just-before-midnight');
  });
});
