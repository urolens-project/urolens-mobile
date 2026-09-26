// Exactly what GET /notifications returns (the backend's NotificationOut, camelCase).
// Note the push-notification payload is a different thing and IS snake_case
// (notification_type / entity_id) — see notificationHandler.ts.
export interface NotificationItem {
  notificationId: string;
  message: string;
  notificationType: string;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}
