/**
 * resyncAfterSubmitRefusal — getting the phone back in step after the server refuses
 * Submit for Verification because of the fields.
 *
 * FIELDS_UNDECIDED names the fields the server still waits on (backend PR #114). If
 * one of them is missing here (its upload's answer was lost) or shows here as decided
 * (a decision the server never got), a normal sync can't fix it — the server's row
 * didn't change, so a delta pull never brings it — so a full pull is requested first.
 * Otherwise a normal sync. Other refusals do nothing.
 */
jest.mock('@nozbe/watermelondb', () => ({
  Q: {
    where: jest.fn((field: string, value: unknown) => ({ field, value })),
    oneOf: jest.fn((values: unknown[]) => ({ oneOf: values })),
  },
}));

let mockLocalFields: { serverId: string; status: string }[] = [];
jest.mock('@db/database', () => ({
  database: {
    get: () => ({
      query: (clause: { value: { oneOf: string[] } }) => ({
        fetch: () =>
          Promise.resolve(mockLocalFields.filter((f) => clause.value.oneOf.includes(f.serverId))),
      }),
    }),
  },
}));

const mockCalls: string[] = [];
const mockSynchronizeAfterCurrent = jest.fn(() => {
  mockCalls.push('sync');
  return Promise.resolve();
});
const mockRequestFullPull = jest.fn(() => {
  mockCalls.push('fullPull');
  return Promise.resolve();
});
jest.mock('@db/sync/syncManager', () => ({
  synchronizeAfterCurrent: () => mockSynchronizeAfterCurrent(),
  requestFullPull: () => mockRequestFullPull(),
}));

import { resyncAfterSubmitRefusal } from '../../src/features/field-capture/lib/resyncAfterSubmitRefusal';
import type { ActionError } from '../../src/hooks/useAsyncAction';

function refusal(code: string, details?: Record<string, unknown>): ActionError {
  const error: ActionError = new Error('refused');
  error.code = code;
  if (details) error.details = details;
  return error;
}

function undecided(...fieldIds: string[]): ActionError {
  return refusal('FIELDS_UNDECIDED', {
    undecidedFields: fieldIds.map((fieldId, i) => ({ fieldId, fieldNo: i + 1 })),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockCalls.length = 0;
  mockLocalFields = [];
});

describe('resyncAfterSubmitRefusal', () => {
  it('does nothing for a refusal that is not about the fields', async () => {
    await resyncAfterSubmitRefusal(refusal('RESULT_NOT_EDITABLE'));
    await resyncAfterSubmitRefusal(null);

    expect(mockCalls).toEqual([]);
  });

  it('syncs after FIELDS_BELOW_MINIMUM, without a full pull', async () => {
    await resyncAfterSubmitRefusal(refusal('FIELDS_BELOW_MINIMUM'));

    expect(mockCalls).toEqual(['sync']);
  });

  it('only syncs when the phone already shows every named field as needing a decision', async () => {
    mockLocalFields = [{ serverId: 'f-1', status: 'ANALYZED' }];

    await resyncAfterSubmitRefusal(undecided('f-1'));

    expect(mockCalls).toEqual(['sync']);
  });

  it('asks for a full pull, then syncs, when a named field is missing on the phone', async () => {
    mockLocalFields = [{ serverId: 'f-1', status: 'ANALYZED' }];

    await resyncAfterSubmitRefusal(undecided('f-1', 'f-2'));

    expect(mockCalls).toEqual(['fullPull', 'sync']);
  });

  it('asks for a full pull when the phone shows a named field as already decided', async () => {
    mockLocalFields = [{ serverId: 'f-1', status: 'ACCEPTED' }];

    await resyncAfterSubmitRefusal(undecided('f-1'));

    expect(mockCalls).toEqual(['fullPull', 'sync']);
  });

  it('only syncs when the server names no fields (an older backend)', async () => {
    await resyncAfterSubmitRefusal(refusal('FIELDS_UNDECIDED'));
    await resyncAfterSubmitRefusal(refusal('FIELDS_UNDECIDED', { undecidedFields: 'nope' }));

    expect(mockCalls).toEqual(['sync', 'sync']);
  });

  it('logs a failed sync instead of throwing', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSynchronizeAfterCurrent.mockImplementationOnce(() =>
      Promise.reject(new Error('Network Error')),
    );

    await expect(
      resyncAfterSubmitRefusal(refusal('FIELDS_BELOW_MINIMUM')),
    ).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();
  });
});
