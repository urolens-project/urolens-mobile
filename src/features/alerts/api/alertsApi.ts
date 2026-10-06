import apiClient from '@lib/apiClient';

import type { NotificationItem } from '../types';

export const alertsApi = {
  /**
   * @description Fetches the signed-in user's 50 most recent notifications, newest first.
   * @param signal - Aborts the request when the screen unmounts or refetches.
   */
  async list(signal?: AbortSignal): Promise<NotificationItem[]> {
    const response = await apiClient.get<NotificationItem[]>('/notifications', { signal });
    return response.data;
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
