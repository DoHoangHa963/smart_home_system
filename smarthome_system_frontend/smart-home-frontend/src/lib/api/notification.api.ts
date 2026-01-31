import axiosClient from '../api';
import { Notification, NotificationFilters, PaginatedNotifications } from '@/types/notification';

export const notificationApi = {
  /**
   * Get notifications for current user with pagination and filters
   */
  getNotifications: async (
    page: number = 0,
    size: number = 20,
    filters?: NotificationFilters
  ): Promise<PaginatedNotifications> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    if (filters?.type) {
      params.append('type', filters.type);
    }
    if (filters?.isRead !== undefined) {
      params.append('isRead', filters.isRead.toString());
    }
    if (filters?.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params.append('endDate', filters.endDate);
    }

    const response = await axiosClient.get(`/notifications?${params.toString()}`);
    return response.data?.data || response.data;
  },

  /**
   * Get notifications for a home
   */
  getNotificationsByHome: async (
    homeId: number,
    page: number = 0,
    size: number = 20,
    filters?: NotificationFilters
  ): Promise<PaginatedNotifications> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });

    if (filters?.type) {
      params.append('type', filters.type);
    }
    if (filters?.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params.append('endDate', filters.endDate);
    }

    const response = await axiosClient.get(`/notifications/home/${homeId}?${params.toString()}`);
    return response.data?.data || response.data;
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (): Promise<number> => {
    const response = await axiosClient.get('/notifications/unread-count');
    return response.data?.data || 0;
  },

  /**
   * Mark notification as read
   */
  markAsRead: async (notificationId: number): Promise<void> => {
    await axiosClient.put(`/notifications/${notificationId}/read`);
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<void> => {
    await axiosClient.put('/notifications/read-all');
  },

  /**
   * Delete a notification
   */
  deleteNotification: async (notificationId: number): Promise<void> => {
    await axiosClient.delete(`/notifications/${notificationId}`);
  },

  /**
   * Delete all notifications
   */
  deleteAllNotifications: async (): Promise<void> => {
    await axiosClient.delete('/notifications/delete-all');
  },
};
