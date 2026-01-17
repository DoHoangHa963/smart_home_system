import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { deviceApi } from '@/lib/api/device.api';
import { DeviceResponse, DeviceStatus, DeviceType, PaginatedResponse, ApiResponse } from '@/types/device';
import { toast } from 'sonner';

interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  room: string;
  roomId?: number;
  deviceCode?: string;
  stateValue?: string;
  isFavorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface DeviceStore {
  devices: Device[];
  paginatedDevices: PaginatedResponse<DeviceResponse> | null;
  currentDevice: DeviceResponse | null;
  isLoading: boolean;
  error: string | null;
  
  fetchAllDevices: (page?: number, size?: number) => Promise<void>;
  fetchDevicesByHome: (homeId: number, page?: number, size?: number) => Promise<void>;
  fetchDevicesByRoom: (roomId: number, page?: number, size?: number) => Promise<void>;
  fetchDeviceById: (deviceId: number) => Promise<void>;
  fetchDeviceByCode: (deviceCode: string) => Promise<void>;
  createDevice: (data: any) => Promise<void>;
  updateDevice: (deviceId: number, data: any) => Promise<void>;
  deleteDevice: (deviceId: number) => Promise<void>;
  toggleDevice: (deviceId: string) => void;
  controlDevice: (deviceId: number, action: 'TURN_ON' | 'TURN_OFF' | 'TOGGLE') => Promise<void>;
  updateDeviceStatus: (deviceId: number, status: DeviceStatus) => Promise<void>;
  sendCommand: (deviceId: number, command: string, payload?: any) => Promise<void>;
  searchDevices: (params: any) => Promise<DeviceResponse[]>;
  getDeviceStatistics: (deviceId: number) => Promise<any>;
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearCurrentDevice: () => void;
  setDevices: (devices: Device[]) => void;
  reset: () => void;
}

const initialState = {
  devices: [],
  paginatedDevices: null,
  currentDevice: null,
  isLoading: false,
  error: null,
};

// Helper to extract data from BE response
const extractDataFromResponse = (responseData: any) => {
  console.log('Extracting data from:', responseData);
  
  // BE trả về { success, message, data, timestamp }
  // data chứa paginated response { content, pageable, ... }
  if (responseData?.data?.content && Array.isArray(responseData.data.content)) {
    return responseData.data.content;
  }
  
  // Hoặc nếu data trực tiếp là array
  if (Array.isArray(responseData?.data)) {
    return responseData.data;
  }
  
  // Hoặc nếu response trực tiếp là array (fallback)
  if (Array.isArray(responseData)) {
    return responseData;
  }
  
  console.warn('No data found in response:', responseData);
  return [];
};

// Helper to get paginated data from BE response
const getPaginatedData = (responseData: any) => {
  if (responseData?.data && typeof responseData.data === 'object') {
    return responseData.data;
  }
  return null;
};

export const useDeviceStore = create<DeviceStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      fetchAllDevices: async (page: number = 0, size: number = 20) => {
        set({ isLoading: true, error: null });
        try {
          const response = await deviceApi.getAllDevices(page, size);
          console.log('fetchAllDevices response:', response.data);
          
          const paginatedData = getPaginatedData(response.data);
          const devicesData = extractDataFromResponse(response.data);
          
          console.log('Paginated data:', paginatedData);
          console.log('Devices data:', devicesData);
          
          const deviceList = devicesData.map((item: DeviceResponse) => ({
            id: item.id.toString(),
            name: item.name,
            type: item.deviceType,
            status: item.deviceStatus,
            room: item.roomName || `Room ${item.roomId}`,
            roomId: item.roomId,
            deviceCode: item.deviceCode,
            stateValue: item.stateValue,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }));
          
          set({
            devices: deviceList,
            paginatedDevices: paginatedData,
            isLoading: false,
          });
        } catch (error: any) {
          console.error('fetchAllDevices error:', error);
          const errorMsg = error.response?.data?.message || 'Failed to fetch devices';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
        }
      },

      fetchDevicesByHome: async (homeId: number, page: number = 0, size: number = 20) => {
        set({ isLoading: true, error: null });
        try {
          const response = await deviceApi.getDevicesByHome(homeId, page, size);
          console.log('fetchDevicesByHome response:', response.data);
          
          const paginatedData = getPaginatedData(response.data);
          const devicesData = extractDataFromResponse(response.data);
          
          console.log('Paginated data:', paginatedData);
          console.log('Devices data:', devicesData);
          
          const deviceList = devicesData.map((item: DeviceResponse) => ({
            id: item.id.toString(),
            name: item.name,
            type: item.deviceType,
            status: item.deviceStatus,
            room: item.roomName || `Room ${item.roomId}`,
            roomId: item.roomId,
            deviceCode: item.deviceCode,
            stateValue: item.stateValue,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }));
          
          set({
            devices: deviceList,
            paginatedDevices: paginatedData,
            isLoading: false,
          });
        } catch (error: any) {
          console.error('fetchDevicesByHome error:', error);
          const errorMsg = error.response?.data?.message || 'Failed to fetch devices';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
        }
      },

      fetchDevicesByRoom: async (roomId: number, page: number = 0, size: number = 20) => {
        set({ isLoading: true, error: null });
        try {
          const response = await deviceApi.getDevicesByRoom(roomId, page, size);
          console.log('fetchDevicesByRoom response:', response.data);
          
          const paginatedData = getPaginatedData(response.data);
          const devicesData = extractDataFromResponse(response.data);
          
          const deviceList = devicesData.map((item: DeviceResponse) => ({
            id: item.id.toString(),
            name: item.name,
            type: item.deviceType,
            status: item.deviceStatus,
            room: item.roomName || `Room ${item.roomId}`,
            roomId: item.roomId,
            deviceCode: item.deviceCode,
            stateValue: item.stateValue,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }));
          
          set({
            devices: deviceList,
            paginatedDevices: paginatedData,
            isLoading: false,
          });
        } catch (error: any) {
          console.error('fetchDevicesByRoom error:', error);
          const errorMsg = error.response?.data?.message || 'Failed to fetch devices';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
        }
      },

      fetchDeviceById: async (deviceId: number) => {
        set({ isLoading: true, error: null });
        try {
          const response = await deviceApi.getDeviceById(deviceId);
          console.log('fetchDeviceById response:', response.data);
          
          // BE trả về device trong data field
          const deviceData = response.data.data || response.data;
          
          set({
            currentDevice: deviceData,
            isLoading: false,
          });
        } catch (error: any) {
          console.error('fetchDeviceById error:', error);
          const errorMsg = error.response?.data?.message || 'Failed to fetch device';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
        }
      },

      fetchDeviceByCode: async (deviceCode: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await deviceApi.getDeviceByCode(deviceCode);
          console.log('fetchDeviceByCode response:', response.data);
          
          // BE trả về device trong data field
          const deviceData = response.data.data || response.data;
          
          set({
            currentDevice: deviceData,
            isLoading: false,
          });
        } catch (error: any) {
          console.error('fetchDeviceByCode error:', error);
          const errorMsg = error.response?.data?.message || 'Failed to fetch device';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
        }
      },

      createDevice: async (data: any) => {
        set({ isLoading: true, error: null });
        try {
          const response = await deviceApi.createDevice(data);
          console.log('createDevice response:', response.data);
          
          // BE trả về created device trong data field
          const newDevice = response.data.data || response.data.result;
          
          if (newDevice) {
            const device: Device = {
              id: newDevice.id.toString(),
              name: newDevice.name,
              type: newDevice.deviceType,
              status: newDevice.deviceStatus,
              room: newDevice.roomName || `Room ${newDevice.roomId}`,
              roomId: newDevice.roomId,
              deviceCode: newDevice.deviceCode,
              stateValue: newDevice.stateValue,
              createdAt: newDevice.createdAt,
              updatedAt: newDevice.updatedAt,
            };
            
            set((state) => ({
              devices: [...state.devices, device],
              isLoading: false,
            }));
          }
        } catch (error: any) {
          console.error('createDevice error:', error);
          const errorMsg = error.response?.data?.message || 'Failed to create device';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
          throw error;
        }
      },

      updateDevice: async (deviceId: number, data: any) => {
        set({ isLoading: true, error: null });
        try {
          const response = await deviceApi.updateDevice(deviceId, data);
          console.log('updateDevice response:', response.data);
          
          // BE trả về updated device trong data field
          const updatedDevice = response.data.data || response.data.result;
          
          if (updatedDevice) {
            // Update in devices list
            set((state) => ({
              devices: state.devices.map((d) =>
                d.id === deviceId.toString()
                  ? {
                      ...d,
                      name: updatedDevice.name,
                      room: updatedDevice.roomName || `Room ${updatedDevice.roomId}`,
                      roomId: updatedDevice.roomId,
                    }
                  : d
              ),
              // Update current device if it's the one being updated
              currentDevice:
                state.currentDevice?.id === deviceId
                  ? updatedDevice
                  : state.currentDevice,
              isLoading: false,
            }));
            
            toast.success('Device updated successfully!');
          }
        } catch (error: any) {
          console.error('updateDevice error:', error);
          const errorMsg = error.response?.data?.message || 'Failed to update device';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
          throw error;
        }
      },

      deleteDevice: async (deviceId: number) => {
        set({ isLoading: true, error: null });
        try {
          const response = await deviceApi.deleteDevice(deviceId);
          console.log('deleteDevice response:', response.data);
          
          set((state) => ({
            devices: state.devices.filter((d) => d.id !== deviceId.toString()),
            currentDevice:
              state.currentDevice?.id === deviceId ? null : state.currentDevice,
            isLoading: false,
          }));
          
          toast.success('Device deleted successfully!');
        } catch (error: any) {
          console.error('deleteDevice error:', error);
          const errorMsg = error.response?.data?.message || 'Failed to delete device';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
          throw error;
        }
      },

      toggleDevice: (deviceId: string) => {
        set((state) => ({
          devices: state.devices.map((device) =>
            device.id === deviceId
              ? {
                  ...device,
                  status:
                    device.status === DeviceStatus.ON
                      ? DeviceStatus.OFF
                      : DeviceStatus.ON,
                }
              : device
          ),
        }));
      },

      controlDevice: async (deviceId: number, action: 'TURN_ON' | 'TURN_OFF' | 'TOGGLE') => {
        set({ isLoading: true, error: null });
        try {
          const response = await deviceApi.controlDevice(deviceId, action);
          console.log('controlDevice response:', response.data);
          
          // Update local state based on action
          let newStatus: DeviceStatus;
          if (action === 'TURN_ON') newStatus = DeviceStatus.ON;
          else if (action === 'TURN_OFF') newStatus = DeviceStatus.OFF;
          else {
            // For TOGGLE, determine based on current state
            const device = get().devices.find(d => d.id === deviceId.toString());
            newStatus = device?.status === DeviceStatus.ON ? DeviceStatus.OFF : DeviceStatus.ON;
          }
          
          set((state) => ({
            devices: state.devices.map((device) =>
              device.id === deviceId.toString()
                ? { ...device, status: newStatus }
                : device
            ),
            // Update current device if it's the one being controlled
            currentDevice:
              state.currentDevice?.id === deviceId
                ? { ...state.currentDevice, deviceStatus: newStatus }
                : state.currentDevice,
            isLoading: false,
          }));
          
          toast.success(`Device ${action.toLowerCase().replace('_', ' ')} successfully!`);
        } catch (error: any) {
          console.error('controlDevice error:', error);
          const errorMsg = error.response?.data?.message || 'Failed to control device';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
        }
      },

      updateDeviceStatus: async (deviceId: number, status: DeviceStatus) => {
        set({ isLoading: true, error: null });
        try {
          const response = await deviceApi.updateDeviceStatus(deviceId, status);
          console.log('updateDeviceStatus response:', response.data);
          
          // BE trả về updated device trong data field
          const updatedDevice = response.data.data || response.data.result;
          
          if (updatedDevice) {
            set((state) => ({
              devices: state.devices.map((d) =>
                d.id === deviceId.toString()
                  ? { ...d, status: updatedDevice.deviceStatus }
                  : d
              ),
              currentDevice:
                state.currentDevice?.id === deviceId
                  ? updatedDevice
                  : state.currentDevice,
              isLoading: false,
            }));
            
            toast.success('Device status updated successfully!');
          }
        } catch (error: any) {
          console.error('updateDeviceStatus error:', error);
          const errorMsg = error.response?.data?.message || 'Failed to update device status';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
        }
      },

      sendCommand: async (deviceId: number, command: string, payload?: any) => {
        set({ isLoading: true, error: null });
        try {
          const response = await deviceApi.sendCommand(deviceId, command, payload);
          console.log('sendCommand response:', response.data);
          
          set({ isLoading: false });
          toast.success('Command sent successfully!');
        } catch (error: any) {
          console.error('sendCommand error:', error);
          const errorMsg = error.response?.data?.message || 'Failed to send command';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
        }
      },

      searchDevices: async (params: any) => {
        set({ isLoading: true, error: null });
        try {
          const response = await deviceApi.searchDevices(params);
          console.log('searchDevices response:', response.data);
          
          // BE trả về devices trong data field
          const devicesData = response.data.data || response.data.result;
          
          if (devicesData) {
            // Convert to Device format for local state
            const deviceList = Array.isArray(devicesData) 
              ? devicesData.map((item: DeviceResponse) => ({
                  id: item.id.toString(),
                  name: item.name,
                  type: item.deviceType,
                  status: item.deviceStatus,
                  room: item.roomName || `Room ${item.roomId}`,
                  roomId: item.roomId,
                  deviceCode: item.deviceCode,
                  stateValue: item.stateValue,
                  createdAt: item.createdAt,
                  updatedAt: item.updatedAt,
                }))
              : [];
            
            set({
              devices: deviceList,
              paginatedDevices: null, // Search results are not paginated
              isLoading: false,
            });
            
            return devicesData;
          }
          return [];
        } catch (error: any) {
          console.error('searchDevices error:', error);
          const errorMsg = error.response?.data?.message || 'Failed to search devices';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
          return [];
        }
      },

      getDeviceStatistics: async (deviceId: number) => {
        set({ isLoading: true, error: null });
        try {
          const response = await deviceApi.getDeviceStatistics(deviceId);
          console.log('getDeviceStatistics response:', response.data);
          
          // BE trả về statistics trong data field
          const stats = response.data.data || response.data.result;
          
          if (stats) {
            set({ isLoading: false });
            return stats;
          }
          return null;
        } catch (error: any) {
          console.error('getDeviceStatistics error:', error);
          const errorMsg = error.response?.data?.message || 'Failed to get device statistics';
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
          return null;
        }
      },

      // Utility methods
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearCurrentDevice: () => set({ currentDevice: null }),
      setDevices: (devices) => set({ devices }),
      reset: () => set(initialState),
    }),
    {
      name: 'device-storage',
      partialize: (state) => ({
        devices: state.devices,
        currentDevice: state.currentDevice,
      }),
    }
  )
);