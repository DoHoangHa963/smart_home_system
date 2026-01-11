import { ApiResponse } from './api';

export interface OverviewStats {
  totalUsers: number;
  newUsersToday: number;
  totalHomes: number;
  newHomesToday: number;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
}

export interface RecentActivity {
  id: number;
  description: string;
  type: 'INFO' | 'WARNING' | 'ERROR';
  timestamp: string;
  relatedUser: string;
}

export interface AdminDashboardData {
  overview: OverviewStats; // <-- Property 'overview' nằm ở đây
  deviceTypeDistribution: Record<string, number>;
  deviceStatusDistribution: Record<string, number>;
  recentActivities: RecentActivity[];
}

export type AdminDashboardResponse = ApiResponse<AdminDashboardData>;