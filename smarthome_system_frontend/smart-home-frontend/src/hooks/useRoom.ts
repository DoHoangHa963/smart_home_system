import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import roomApi, { roomKeys } from '@/lib/api/room.api';
import {
  RoomRequest,
  RoomResponse,
  RoomWithStatistics,
  PaginatedRooms,
  RoomQueryParams,
  RoomSummary,
} from '@/types/room';
import { ApiError } from '@/types/api';

// Get rooms by home ID
export const useRoomsByHome = (
  homeId: number | undefined,
  // 1. Dùng Omit để fix lỗi 'queryKey is missing' khi gọi ở component
  options?: Omit<UseQueryOptions<RoomResponse[] | PaginatedRooms, ApiError, RoomResponse[]>, 'queryKey' | 'queryFn'>
) => {
  /* 2. Truyền 3 tham số Generic vào useQuery:
        - TQueryFnData: RoomResponse[] | PaginatedRooms (Kiểu dữ liệu API trả về thô)
        - TError: ApiError (Kiểu lỗi)
        - TData: RoomResponse[] (Kiểu dữ liệu SAU KHI qua hàm select - Return Type thực tế)
  */
  return useQuery<RoomResponse[] | PaginatedRooms, ApiError, RoomResponse[]>({
    queryKey: roomKeys.homeRooms(homeId!),
    queryFn: () => roomApi.getRoomsByHomeId(homeId!),
    enabled: !!homeId,
    // 3. Hàm select giúp chuẩn hóa dữ liệu: Luôn trả về Mảng
    select: (data) => {
      // Nếu là PaginatedRooms (có .content) -> lấy content
      if ('content' in data) {
        return data.content;
      }
      // Nếu đã là mảng -> trả về nguyên vẹn
      return data as RoomResponse[];
    },
    ...options,
  });
};

// Get paginated rooms by home ID
export const usePaginatedRooms = (
  params: RoomQueryParams,
  options?: UseQueryOptions<PaginatedRooms, ApiError>
) => {
  return useQuery<PaginatedRooms, ApiError>({
    queryKey: roomKeys.list(params),
    queryFn: () => roomApi.getRoomsByHomeIdPaginated(
      params.homeId,
      params.page,
      params.size,
      params.sort
    ),
    enabled: !!params.homeId,
    ...options,
  });
};

// Get room by ID
export const useRoom = (
  roomId: number | undefined,
  options?: UseQueryOptions<RoomResponse, ApiError>
) => {
  return useQuery<RoomResponse, ApiError>({
    queryKey: roomKeys.detail(roomId!),
    queryFn: () => roomApi.getRoomById(roomId!),
    enabled: !!roomId,
    ...options,
  });
};

// Get room with statistics
export const useRoomStatistics = (
  roomId: number | undefined,
  options?: UseQueryOptions<RoomWithStatistics, ApiError>
) => {
  return useQuery<RoomWithStatistics, ApiError>({
    queryKey: roomKeys.statistics(roomId!),
    queryFn: () => roomApi.getRoomStatistics(roomId!),
    enabled: !!roomId,
    ...options,
  });
};

// Get room summary
export const useRoomSummary = (
  homeId: number | undefined,
  options?: UseQueryOptions<RoomSummary, ApiError>
) => {
  return useQuery<RoomSummary, ApiError>({
    queryKey: roomKeys.summary(homeId!),
    queryFn: () => roomApi.getRoomSummary(homeId!),
    enabled: !!homeId,
    ...options,
  });
};

// Create room mutation
export const useCreateRoom = () => {
  const queryClient = useQueryClient();
  
  return useMutation<RoomResponse, ApiError, RoomRequest>({
    mutationFn: roomApi.createRoom,
    onSuccess: (data, variables) => {
      // Invalidate rooms list for the home
      queryClient.invalidateQueries({ queryKey: roomKeys.homeRooms(variables.homeId) });
      queryClient.invalidateQueries({ queryKey: roomKeys.summary(variables.homeId) });
      
      // Add new room to cache
      queryClient.setQueryData(roomKeys.detail(data.id), data);
    },
  });
};

// Update room mutation
export const useUpdateRoom = () => {
  const queryClient = useQueryClient();
  
  return useMutation<RoomResponse, ApiError, { roomId: number; data: RoomRequest }>({
    mutationFn: ({ roomId, data }) => roomApi.updateRoom(roomId, data),
    onSuccess: (data, variables) => {
      // Invalidate rooms list for the home
      queryClient.invalidateQueries({ queryKey: roomKeys.homeRooms(variables.data.homeId) });
      
      // Update room in cache
      queryClient.setQueryData(roomKeys.detail(variables.roomId), data);
      
      // Invalidate statistics if exists
      queryClient.invalidateQueries({ queryKey: roomKeys.statistics(variables.roomId) });
    },
  });
};

// Delete room mutation
export const useDeleteRoom = () => {
  const queryClient = useQueryClient();
  
  return useMutation<void, ApiError, { roomId: number; homeId: number }>({
    mutationFn: ({ roomId }) => roomApi.deleteRoom(roomId),
    onSuccess: (_, variables) => {
      // Invalidate rooms list for the home
      queryClient.invalidateQueries({ queryKey: roomKeys.homeRooms(variables.homeId) });
      queryClient.invalidateQueries({ queryKey: roomKeys.summary(variables.homeId) });
      
      // Remove room from cache
      queryClient.removeQueries({ queryKey: roomKeys.detail(variables.roomId) });
      queryClient.removeQueries({ queryKey: roomKeys.statistics(variables.roomId) });
    },
  });
};

// Move device to room mutation
export const useMoveDeviceToRoom = () => {
  const queryClient = useQueryClient();
  
  return useMutation<void, ApiError, { roomId: number; deviceId: number }>({
    mutationFn: ({ roomId, deviceId }) => roomApi.moveDeviceToRoom(roomId, deviceId),
    onSuccess: (_, variables) => {
      // Invalidate room statistics
      queryClient.invalidateQueries({ queryKey: roomKeys.statistics(variables.roomId) });
      
      // Also invalidate device queries if they exist
      // queryClient.invalidateQueries({ queryKey: deviceKeys.detail(variables.deviceId) });
    },
  });
};