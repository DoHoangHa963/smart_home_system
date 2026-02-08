import axiosClient from '../api';
import { EventLog, EventLogFilters, PaginatedEventLogs } from '@/types/log';

export const logApi = {
  /**
   * Get event logs for a home with pagination and filters
   */
  getLogsByHome: async (
    homeId: number,
    page: number = 0,
    size: number = 20,
    filters?: EventLogFilters
  ): Promise<PaginatedEventLogs> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sortBy: 'createdAt',
      sortDirection: 'DESC',
    });

    if (filters?.eventType) {
      params.append('eventType', filters.eventType);
    }
    if (filters?.startDate) {
      params.append('startDate', filters.startDate);
    }
    if (filters?.endDate) {
      params.append('endDate', filters.endDate);
    }

    const response = await axiosClient.get(`/logs/home/${homeId}?${params.toString()}`);
    return response.data?.data || response.data;
  },
};
