import { ApiResponse } from './api';

// Room Request Type
export interface RoomRequest {
  name: string;
  homeId: number;
}

// Room Response Type
export interface RoomResponse {
  id: number;
  name: string;
  homeId: number;
  homeName: string;
  deviceCount: number;
  createdAt?: string;
  updatedAt?: string;
}

// Room Statistics Type
export interface RoomStatistics {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  deviceTypes: {
    [key: string]: number;
  };
  lastUpdated: string;
}

// Room with Statistics
export interface RoomWithStatistics extends RoomResponse {
  statistics?: RoomStatistics;
}

// Paginated Rooms Response
export interface PaginatedRooms {
  content: RoomResponse[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

// API Response Types
export type RoomApiResponse = ApiResponse<RoomResponse>;
export type RoomListApiResponse = ApiResponse<RoomResponse[]>;
export type PaginatedRoomsApiResponse = ApiResponse<PaginatedRooms>;
export type RoomWithStatsApiResponse = ApiResponse<RoomWithStatistics>;
export type VoidApiResponse = ApiResponse<null>;

// Room Query Parameters
export interface RoomQueryParams {
  homeId: number;
  page?: number;
  size?: number;
  sort?: string;
  name?: string;
}

// Room Filter Options
export interface RoomFilter {
  name?: string;
  hasDevices?: boolean;
  minDevices?: number;
  maxDevices?: number;
}

// Room Sorting Options
export enum RoomSortBy {
  NAME_ASC = 'name,asc',
  NAME_DESC = 'name,desc',
  DEVICE_COUNT_ASC = 'deviceCount,asc',
  DEVICE_COUNT_DESC = 'deviceCount,desc',
  CREATED_AT_ASC = 'createdAt,asc',
  CREATED_AT_DESC = 'createdAt,desc',
}

// Room Event Types
export enum RoomEventType {
  ROOM_CREATED = 'ROOM_CREATED',
  ROOM_UPDATED = 'ROOM_UPDATED',
  ROOM_DELETED = 'ROOM_DELETED',
  DEVICE_MOVED = 'DEVICE_MOVED',
}

// Room Event
export interface RoomEvent {
  type: RoomEventType;
  roomId: number;
  homeId: number;
  userId: string;
  timestamp: string;
  data?: Record<string, any>;
}

// Room Summary for Dashboard
export interface RoomSummary {
  totalRooms: number;
  totalDevices: number;
  roomsWithDevices: number;
  averageDevicesPerRoom: number;
  recentlyUpdated: RoomResponse[];
}

// Room Creation Result
export interface RoomCreationResult {
  room: RoomResponse;
  message: string;
  success: boolean;
}

// Room Deletion Result
export interface RoomDeletionResult {
  roomId: number;
  message: string;
  success: boolean;
  devicesMoved?: number;
}