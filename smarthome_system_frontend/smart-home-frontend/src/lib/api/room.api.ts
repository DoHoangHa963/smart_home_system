import api from '@/lib/api';
import { ApiResponse } from '@/types/api';
import {
  RoomRequest,
  RoomResponse,
  RoomWithStatistics,
  PaginatedRooms,
  RoomQueryParams,
  RoomApiResponse,
  RoomListApiResponse,
  PaginatedRoomsApiResponse,
  RoomWithStatsApiResponse,
  VoidApiResponse,
  RoomSummary,
} from '@/types/room';

// Room API Service
const roomApi = {
  // Create a new room
  createRoom: async (data: RoomRequest): Promise<RoomResponse> => {
    const response = await api.post<RoomApiResponse>('/rooms', data);
    return response.data.data;
  },

  // Get room by ID
  getRoomById: async (roomId: number): Promise<RoomResponse> => {
    const response = await api.get<RoomApiResponse>(`/rooms/${roomId}`);
    return response.data.data;
  },

  // Update room
  updateRoom: async (roomId: number, data: RoomRequest): Promise<RoomResponse> => {
    const response = await api.put<RoomApiResponse>(`/rooms/${roomId}`, data);
    return response.data.data;
  },

  // Delete room
  deleteRoom: async (roomId: number): Promise<void> => {
    await api.delete<VoidApiResponse>(`/rooms/${roomId}`);
  },

  // Get all rooms in a home (non-paginated)
  getRoomsByHomeId: async (homeId: number): Promise<RoomResponse[]> => {
    const response = await api.get<RoomListApiResponse>(`/rooms/home/${homeId}`);
    return response.data.data;
  },

  // Get paginated rooms in a home
  getRoomsByHomeIdPaginated: async (
    homeId: number, 
    page = 0, 
    size = 20, 
    sort = 'name,asc'
  ): Promise<PaginatedRooms> => {
    const params = { page, size, sort };
    const response = await api.get<PaginatedRoomsApiResponse>(
      `/rooms/home/${homeId}`, 
      { params }
    );
    return response.data.data;
  },

  // Search rooms in a home
  searchRooms: async (
    homeId: number, 
    searchTerm?: string, 
    page = 0, 
    size = 20, 
    sort = 'name,asc'
  ): Promise<PaginatedRooms> => {
    const params: Record<string, any> = { page, size, sort };
    if (searchTerm) params.name = searchTerm;
    
    const response = await api.get<PaginatedRoomsApiResponse>(
      `/rooms/home/${homeId}/search`, 
      { params }
    );
    return response.data.data;
  },

  // Move device to room
  moveDeviceToRoom: async (roomId: number, deviceId: number): Promise<void> => {
    await api.put<VoidApiResponse>(`/rooms/${roomId}/devices/${deviceId}/move`);
  },

  // Get room with statistics
  getRoomStatistics: async (roomId: number): Promise<RoomWithStatistics> => {
    const response = await api.get<RoomWithStatsApiResponse>(`/rooms/${roomId}/statistics`);
    return response.data.data;
  },

  // Get room summary for dashboard
  getRoomSummary: async (homeId: number): Promise<RoomSummary> => {
    const response = await api.get<ApiResponse<RoomSummary>>(`/rooms/home/${homeId}/summary`);
    return response.data.data;
  },

  // Validate room name (check for duplicates)
  validateRoomName: async (homeId: number, name: string, roomId?: number): Promise<boolean> => {
    const params: Record<string, any> = { homeId, name };
    if (roomId) params.excludeRoomId = roomId;
    
    const response = await api.get<ApiResponse<{ valid: boolean; message?: string }>>(
      '/rooms/validate-name', 
      { params }
    );
    return response.data.data.valid;
  },

  // Bulk operations
  bulkCreateRooms: async (homeId: number, rooms: Omit<RoomRequest, 'homeId'>[]): Promise<RoomResponse[]> => {
    const data = rooms.map(room => ({ ...room, homeId }));
    const response = await api.post<RoomListApiResponse>('/rooms/bulk', data);
    return response.data.data;
  },

  // Export rooms to CSV/Excel
  exportRooms: async (homeId: number, format: 'csv' | 'excel' = 'csv'): Promise<Blob> => {
    const response = await api.get(`/rooms/home/${homeId}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },
};

// Room Query Builder (helper for building queries)
export const buildRoomQuery = (params: RoomQueryParams): Record<string, any> => {
  const query: Record<string, any> = {};
  
  if (params.page !== undefined) query.page = params.page;
  if (params.size !== undefined) query.size = params.size;
  if (params.sort) query.sort = params.sort;
  if (params.name) query.name = params.name;
  
  return query;
};

export const getRoomsByHomeId = async (homeId: number): Promise<RoomResponse[]> => {
  const response = await api.get<PaginatedRoomsApiResponse>(`/rooms/home/${homeId}`);
  const responseData = response.data.data;
  
  // API trả về PaginatedRooms, chúng ta cần lấy content
  if (responseData && typeof responseData === 'object' && 'content' in responseData) {
    return responseData.content;
  }
  
  // Fallback: return empty array
  return [];
};

export const getRoomsByHomeIdPaginated = async (
  homeId: number, 
  page = 0, 
  size = 20, 
  sort = 'name,asc'
): Promise<PaginatedRooms> => {
  const params = { page, size, sort };
  const response = await api.get<PaginatedRoomsApiResponse>(
    `/rooms/home/${homeId}`, 
    { params }
  );
  return response.data.data;
};

// Room Cache Keys (for React Query)
export const roomKeys = {
  all: ['rooms'] as const,
  lists: () => [...roomKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...roomKeys.lists(), filters] as const,
  details: () => [...roomKeys.all, 'detail'] as const,
  detail: (id: number) => [...roomKeys.details(), id] as const,
  homeRooms: (homeId: number) => [...roomKeys.all, 'home', homeId] as const,
  statistics: (roomId: number) => [...roomKeys.detail(roomId), 'statistics'] as const,
  summary: (homeId: number) => [...roomKeys.all, 'summary', homeId] as const,
};

export default roomApi;