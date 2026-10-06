import apiClient from '@lib/apiClient';

import { alertsApi } from '@features/alerts/api/alertsApi';

jest.mock('@lib/apiClient', () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

const getMock = apiClient.get as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('alertsApi.list', () => {
  it('fetches the default page with no params', async () => {
    getMock.mockResolvedValue({ data: [] });
    await alertsApi.list();
    expect(getMock).toHaveBeenCalledWith('/notifications', {
      params: undefined,
      signal: undefined,
    });
  });

  it('forwards limit, before, and unreadOnly', async () => {
    getMock.mockResolvedValue({ data: [] });
    await alertsApi.list({ limit: 20, before: 'notif-1', unreadOnly: true });
    expect(getMock).toHaveBeenCalledWith('/notifications', {
      params: { limit: 20, before: 'notif-1', unreadOnly: true },
      signal: undefined,
    });
  });
});

describe('alertsApi.getUnreadCount', () => {
  it('returns the unreadCount field from the response', async () => {
    getMock.mockResolvedValue({ data: { unreadCount: 42 } });
    expect(await alertsApi.getUnreadCount()).toBe(42);
    expect(getMock).toHaveBeenCalledWith('/notifications/unread-count', { signal: undefined });
  });
});
