// src/hooks/useDevice.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api'; // Axios instance của bạn
import { ApiResponse } from '@/types/api';

// Định nghĩa kiểu Device (cơ bản)
export interface Device {
  id: number;
  name: string;
  type: string;
  roomId: number;
  status: 'on' | 'off' | 'offline';
  // ... các trường khác
}

// API get devices by room
const getDevicesByRoom = async (roomId: number): Promise<Device[]> => {
  // Giả định endpoint API, bạn sửa lại cho khớp backend
  const response = await api.get<ApiResponse<Device[]>>(`/rooms/${roomId}/devices`);
  return response.data.data;
};

// Hook useDevicesByRoom
export const useDevicesByRoom = (roomId: number | undefined) => {
  return useQuery({
    queryKey: ['devices', 'room', roomId],
    queryFn: () => getDevicesByRoom(roomId!),
    enabled: !!roomId,
  });
};