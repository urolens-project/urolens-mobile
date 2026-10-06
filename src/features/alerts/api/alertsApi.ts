import apiClient from '@lib/apiClient';

import type { NotificationItem } from '../types';

export interface ListNotificationsParams {
  /** Max rows to return; the backend defaults to 50 and caps at 100. */
  limit?: number;
  /** Only rows older than this notification id — pages backward for "load more". */
  before?: string;
  /** Server-side unread filter, so filtering isn't limited to whatever page is loaded. */
  unreadOnly?: boolean;
}

export const alertsApi = {
  /**
   * @description Fetches the signed-in user's notifications, newest first.
   * @param params - Paging/filter options; omit for the default page (50 most recent).
   * @param signal - Aborts the request when the screen unmounts or refetches.
   */
  async list(params?: ListNotificationsParams, signal?: AbortSignal): Promise<NotificationItem[]> {
    const response = await apiClient.get<NotificationItem[]>('/notifications', {
      params,
      signal,
    });
    return response.data;
  },

  /**
   * @description Fetches the signed-in user's true unread count, independent of how many
   * notifications are currently loaded — backs the bell/tab badge.
   * @param signal - Aborts the request when the caller no longer needs the result.
   */
  async getUnreadCount(signal?: AbortSignal): Promise<number> {
    const response = await apiClient.get<{ unreadCount: number }>('/notifications/unread-count', {
      signal,
    });
    return response.data.unreadCount;
  },

  /**
   * @description Marks one of the signed-in user's notifications read.
   * @param notificationId - Id of the notification to mark read.
   */
  async markRead(notificationId: string): Promise<void> {
    await apiClient.patch(`/notifications/${notificationId}/read`);
  },

  /**
   * @description Marks every one of the signed-in user's unread notifications read.
   */
  async markAllRead(): Promise<void> {
    await apiClient.patch('/notifications/read-all');
  },
};
