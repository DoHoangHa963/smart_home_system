import axiosClient from '../api';
import { DeviceResponse, DeviceType, DeviceStatus, PaginatedResponse } from '@/types/device';

export const deviceApi = {
  getDevicesByHome: (homeId: number, page: number = 0, size: number = 20) => {
    return axiosClient.get(`/devices/home/${homeId}?page=${page}&size=${size}&sortBy=createdAt&sortDirection=DESC`);
  },
  
  getAllDevices: (page: number = 0, size: number = 20) => {
    return axiosClient.get(`/devices?page=${page}&size=${size}`);
  },
  
  getDevicesByRoom: (roomId: number, page: number = 0, size: number = 20) => {
    return axiosClient.get(`/devices/room/${roomId}?page=${page}&size=${size}`);
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
  
  controlDevice: (deviceId: number, action: 'TURN_ON' | 'TURN_OFF' | 'TOGGLE') => {
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