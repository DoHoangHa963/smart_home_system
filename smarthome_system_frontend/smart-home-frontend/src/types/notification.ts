export enum NotificationType {
  EMERGENCY = 'EMERGENCY',
  WARNING = 'WARNING',
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
}

export interface Notification {
  id: number;
  homeId?: number;
  homeName?: string;
  userId?: string;
  username?: string;
  deviceId?: number;
  deviceName?: string;
  deviceCode?: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  metadata?: string;
  createdAt: string;
}

export interface NotificationFilters {
  type?: NotificationType;
  isRead?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedNotifications {
  content: Notification[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
