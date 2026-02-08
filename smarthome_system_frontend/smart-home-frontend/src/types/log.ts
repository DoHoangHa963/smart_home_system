export interface EventLog {
  id: number;
  homeId: number | null;
  homeName: string | null;
  deviceId: number | null;
  deviceName: string | null;
  deviceCode: string | null;
  userId: string | null;
  username: string;
  source: string;
  eventType: string;
  eventValue: string | null;
  createdAt: string;
}

export interface EventLogFilters {
  eventType?: string;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedEventLogs {
  content: EventLog[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
