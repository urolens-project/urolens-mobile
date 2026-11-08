/**
 * drainLegacyQueuedActions: retires CONFIRM_RESULT/OVERRIDE_PARAMETER/DISCARD_IMAGE
 * queued before the multi-field workflow shipped.
 *
 * Covers the gate added in mobile PR #55 review, 1.3: the drain must not run until a
 * pull has shown the server's field workflow flag is on (FIELD_WORKFLOW_SEEN_KEY) —
 * otherwise it would mark actions FAILED that a flag-off server would still accept.
 */

jest.mock('@nozbe/watermelondb', () => ({
  Q: {
    where: jest.fn((field: string, value: unknown) => ({ field, value })),
    oneOf: jest.fn((values: unknown[]) => ({ oneOf: values })),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockFetch = jest.fn().mockResolvedValue([]);
jest.mock('../../src/db/database', () => ({
  database: {
    get: jest.fn(() => ({ query: jest.fn(() => ({ fetch: mockFetch })) })),
    write: jest.fn((fn: () => Promise<unknown>) => fn()),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

import { drainLegacyQueuedActions, FIELD_WORKFLOW_SEEN_KEY } from '../../src/db/sync/legacyQueue';

const LEGACY_QUEUE_DRAINED_KEY = 'urolens_legacy_queue_drained_v1';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockFetch.mockResolvedValue([]);
});

describe('drainLegacyQueuedActions', () => {
  it('does nothing when no pull has yet seen the field workflow flag', async () => {
    mockGetItem.mockResolvedValue(null);

    await drainLegacyQueuedActions();

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockSetItem).not.toHaveBeenCalledWith(LEGACY_QUEUE_DRAINED_KEY, '1');
  });

  it('runs once the field workflow flag has been seen', async () => {
    mockGetItem.mockImplementation(async (key: string) =>
      key === FIELD_WORKFLOW_SEEN_KEY ? '1' : null,
    );

    await drainLegacyQueuedActions();

    expect(mockFetch).toHaveBeenCalled();
    expect(mockSetItem).toHaveBeenCalledWith(LEGACY_QUEUE_DRAINED_KEY, '1');
  });

  it('does not re-run once already drained', async () => {
    mockGetItem.mockImplementation(async (key: string) =>
      key === FIELD_WORKFLOW_SEEN_KEY || key === LEGACY_QUEUE_DRAINED_KEY ? '1' : null,
    );

    await drainLegacyQueuedActions();

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
