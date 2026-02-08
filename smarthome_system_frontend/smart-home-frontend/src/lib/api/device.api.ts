import axiosClient from '../api';
import { DeviceResponse, DeviceType, DeviceStatus, PaginatedResponse } from '@/types/device';

export const deviceApi = {
  getDevicesByHome: (homeId: number, page: number = 0, size: number = 20) => {
    // Spring Boot Pageable expects 'sort' parameter in format 'property,direction'
    return axiosClient.get(`/devices/home/${homeId}?page=${page}&size=${size}&sort=createdAt,desc`);
  },

  getAllDevices: (page: number = 0, size: number = 20) => {
    return axiosClient.get(`/devices?page=${page}&size=${size}&sort=createdAt,desc`);
  },

  getDevicesByRoom: (roomId: number, page: number = 0, size: number = 20) => {
    return axiosClient.get(`/devices/room/${roomId}?page=${page}&size=${size}&sort=createdAt,desc`);
  },

  getDeviceById: (deviceId: number) => {
    return axiosClient.get(`/devices/${deviceId}`);
  },

  getDeviceByCode: (deviceCode: string) => {
    return axiosClient.get(`/devices/code/${deviceCode}`);
  },

  createDevice: (data: any) => {
    return axiosClient.post('/devices', data);
  },

  updateDevice: (deviceId: number, data: any) => {
    return axiosClient.put(`/devices/${deviceId}`, data);
  },

  deleteDevice: (deviceId: number) => {
    return axiosClient.delete(`/devices/${deviceId}`);
  },

  controlDevice: async (deviceId: number, action: 'TURN_ON' | 'TURN_OFF' | 'TOGGLE') => {
    // Backend không có endpoint /toggle, nên cần xử lý riêng
    if (action === 'TOGGLE') {
      // Lấy device info để kiểm tra status hiện tại
      try {
        const deviceResponse = await axiosClient.get(`/devices/${deviceId}`);
        const device = deviceResponse.data?.data;
        const currentStatus = device?.status?.toUpperCase();

        // Quyết định turn-on hay turn-off dựa trên status hiện tại
        const toggleAction = (currentStatus === 'ON' || currentStatus === 'true') ? 'TURN_OFF' : 'TURN_ON';
        const endpoint = toggleAction.toLowerCase().replace('_', '-');
        return axiosClient.post(`/devices/${deviceId}/${endpoint}`);
      } catch (error) {
        // Nếu không lấy được device info, mặc định dùng command API
        return axiosClient.post(`/devices/${deviceId}/command?command=TOGGLE`);
      }
    }

    // Với TURN_ON và TURN_OFF, dùng endpoint trực tiếp
    const endpoint = action.toLowerCase().replace('_', '-');
    return axiosClient.post(`/devices/${deviceId}/${endpoint}`);
  },

  sendCommand: (deviceId: number, command: string, payload?: any) => {
    return axiosClient.post(`/devices/${deviceId}/command`, { command, payload });
  },

  updateDeviceStatus: (deviceId: number, status: DeviceStatus) => {
    return axiosClient.patch(`/devices/${deviceId}/status?status=${status}`);
  },

  searchDevices: (params: any) => {
    return axiosClient.get('/devices/search', { params });
  },

  getDeviceStatistics: (deviceId: number) => {
    return axiosClient.get(`/devices/${deviceId}/statistics`);
  },
};