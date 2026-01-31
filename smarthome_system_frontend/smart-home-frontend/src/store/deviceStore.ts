import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { deviceApi } from '@/lib/api/device.api';
import { mcuApi, MCUOnlineStatus } from '@/lib/api/mcu.api';
import { DeviceResponse, DeviceStatus, DeviceType, PaginatedResponse, ApiResponse } from '@/types/device';
import { toast } from 'sonner';
import { getUserFriendlyError } from '@/utils/errorHandler';

interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  room: string;
  roomId?: number;
  deviceCode?: string;
  stateValue?: string;
  metadata?: string;
  gpioPin?: number | null; // GPIO Pin từ ESP32
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

  // MCU status
  mcuStatus: MCUOnlineStatus | null;
  currentHomeId: number | null;

  fetchAllDevices: (page?: number, size?: number) => Promise<void>;
  fetchDevicesByHome: (homeId: number, page?: number, size?: number) => Promise<void>;
  fetchDevicesByRoom: (roomId: number, page?: number, size?: number) => Promise<void>;
  fetchDeviceById: (deviceId: number) => Promise<void>;
  fetchDeviceByCode: (deviceCode: string) => Promise<void>;
  createDevice: (data: any) => Promise<void>;
  updateDevice: (deviceId: number, data: any) => Promise<void>;
  deleteDevice: (deviceId: number) => Promise<void>;
  toggleDevice: (deviceId: string) => void;
  controlDevice: (deviceId: number, action: 'TURN_ON' | 'TURN_OFF' | 'TOGGLE', homeId?: number) => Promise<void>;
  updateDeviceStatus: (deviceId: number, status: DeviceStatus) => Promise<void>;
  sendCommand: (deviceId: number, command: string, payload?: any) => Promise<void>;
  searchDevices: (params: any) => Promise<DeviceResponse[]>;
  getDeviceStatistics: (deviceId: number) => Promise<any>;

  // MCU status functions
  checkMCUStatus: (homeId: number) => Promise<MCUOnlineStatus>;
  setMCUStatus: (status: MCUOnlineStatus | null) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearCurrentDevice: () => void;
  setDevices: (devices: Device[]) => void;
  reset: () => void;
  
  // WebSocket update methods
  updateDeviceFromWebSocket: (deviceStatusUpdate: {
    gpioPin?: number;
    deviceCode?: string;
    status?: string;
    stateValue?: string;
  }) => void;
}

const initialState = {
  devices: [],
  paginatedDevices: null,
  currentDevice: null,
  isLoading: false,
  error: null,
  mcuStatus: null as MCUOnlineStatus | null,
  currentHomeId: null as number | null,
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

// Helper to extract device status from stateValue JSON string
// stateValue format: "{"power": "ON"}" or "{"power": "OFF"}"
const getDeviceStatusFromStateValue = (stateValue?: string): DeviceStatus | null => {
  if (!stateValue) return null;

  try {
    const parsed = typeof stateValue === 'string' ? JSON.parse(stateValue) : stateValue;
    const power = parsed?.power;

    if (power === 'ON' || power === 'on') {
      return DeviceStatus.ON;
    }
    if (power === 'OFF' || power === 'off') {
      return DeviceStatus.OFF;
    }
  } catch (error) {
    console.warn('Failed to parse stateValue:', stateValue, error);
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

          const deviceList = devicesData.map((item: any) => {
            // Extract status from stateValue first (most accurate), then fallback to deviceStatus/status
            const statusFromStateValue = getDeviceStatusFromStateValue(item.stateValue);
            const status = statusFromStateValue || item.deviceStatus || item.status;

            return {
              id: item.id.toString(),
              name: item.name,
              type: item.deviceType || item.type,
              status: status,
              room: item.roomName || `Room ${item.roomId}`,
              roomId: item.roomId,
              deviceCode: item.deviceCode,
              stateValue: item.stateValue,
              metadata: item.metadata,
              gpioPin: item.gpioPin,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            };
          });

          set({
            devices: deviceList,
            paginatedDevices: paginatedData,
            isLoading: false,
          });
        } catch (error: any) {
          console.error('fetchAllDevices error:', error);
          const errorMsg = getUserFriendlyError(error);
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

          const deviceList = devicesData.map((item: any) => {
            // Extract status from stateValue first (most accurate), then fallback to deviceStatus/status
            const statusFromStateValue = getDeviceStatusFromStateValue(item.stateValue);
            const status = statusFromStateValue || item.deviceStatus || item.status;

            return {
              id: item.id.toString(),
              name: item.name,
              type: item.deviceType || item.type,
              status: status,
              room: item.roomName || `Room ${item.roomId}`,
              roomId: item.roomId,
              deviceCode: item.deviceCode,
              stateValue: item.stateValue,
              metadata: item.metadata,
              gpioPin: item.gpioPin,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            };
          });

          set({
            devices: deviceList,
            paginatedDevices: paginatedData,
            isLoading: false,
          });
        } catch (error: any) {
          console.error('fetchDevicesByHome error:', error);
          const errorMsg = getUserFriendlyError(error);
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

          const deviceList = devicesData.map((item: any) => {
            // Extract status from stateValue first (most accurate), then fallback to deviceStatus/status
            const statusFromStateValue = getDeviceStatusFromStateValue(item.stateValue);
            const status = statusFromStateValue || item.deviceStatus || item.status;

            return {
              id: item.id.toString(),
              name: item.name,
              type: item.deviceType || item.type,
              status: status,
              room: item.roomName || `Room ${item.roomId}`,
              roomId: item.roomId,
              deviceCode: item.deviceCode,
              stateValue: item.stateValue,
              metadata: item.metadata,
              gpioPin: item.gpioPin,
              createdAt: item.createdAt,
              updatedAt: item.updatedAt,
            };
          });

          set({
            devices: deviceList,
            paginatedDevices: paginatedData,
            isLoading: false,
          });
        } catch (error: any) {
          console.error('fetchDevicesByRoom error:', error);
          const errorMsg = getUserFriendlyError(error);
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
          const errorMsg = getUserFriendlyError(error);
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
          const errorMsg = getUserFriendlyError(error);
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
              metadata: newDevice.metadata,
              gpioPin: newDevice.gpioPin,
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
          const errorCode = error.response?.data?.code;
          const status = error.response?.status;

          // Đối với lỗi 409 (Conflict) hoặc 5010 (DEVICE_ALREADY_EXISTS), 
          // KHÔNG set error state và KHÔNG throw để tránh refresh trang
          // Lỗi sẽ được xử lý trong component (AddDeviceDialog)
          if (status === 409 || errorCode === 5010) {
            set({ isLoading: false, error: null }); // Không set error để tránh hiển thị nút "Thử lại"
            // Không throw error để component có thể xử lý gracefully
            throw error;
          }

          // Đối với các lỗi khác, set error state và throw
          const errorMsg = getUserFriendlyError(error);
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
                    metadata: updatedDevice.metadata,
                    gpioPin: updatedDevice.gpioPin,
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

            toast.success('Đã cập nhật thiết bị thành công!');
          }
        } catch (error: any) {
          console.error('updateDevice error:', error);
          const errorMsg = getUserFriendlyError(error);
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
          throw error;
        }
      },

      deleteDevice: async (deviceId: number) => {
        set({ isLoading: true, error: null });
        try {
          const response = await deviceApi.deleteDevice(deviceId);
          console.log('deleteDevice response:', response);

          // Kiểm tra response thành công
          // Backend trả về ApiResponse với data: null khi xóa thành công
          const isSuccess = response.status >= 200 && response.status < 300;
          const responseData = response.data;
          const hasSuccessFlag = responseData?.success === true || responseData?.success === undefined;
          const hasErrorMessage = responseData?.success === false;

          // Nếu có error message rõ ràng từ backend, throw error
          if (hasErrorMessage || (!isSuccess && responseData?.message)) {
            throw new Error(responseData?.message || 'Failed to delete device');
          }

          // Nếu response thành công (status 200-299) và không có error flag, coi là thành công
          if (isSuccess && hasSuccessFlag) {
            // Cập nhật state - xóa device khỏi danh sách
            set((state) => ({
              devices: state.devices.filter((d) => d.id !== deviceId.toString()),
              currentDevice:
                state.currentDevice?.id === deviceId ? null : state.currentDevice,
              isLoading: false,
            }));

            toast.success('Đã xóa thiết bị thành công!');
            return; // Return early để không throw error
          }

          // Nếu không rõ ràng, vẫn coi là thành công nếu status 200-299
          if (isSuccess) {
            set((state) => ({
              devices: state.devices.filter((d) => d.id !== deviceId.toString()),
              currentDevice:
                state.currentDevice?.id === deviceId ? null : state.currentDevice,
              isLoading: false,
            }));

            toast.success('Đã xóa thiết bị thành công!');
            return;
          }

          // Nếu không thành công, throw error
          throw new Error(responseData?.message || 'Không thể xóa thiết bị');
        } catch (error: any) {
          console.error('deleteDevice error:', error);
          const errorMsg = getUserFriendlyError(error);
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

      controlDevice: async (deviceId: number, action: 'TURN_ON' | 'TURN_OFF' | 'TOGGLE', homeId?: number) => {
        set({ isLoading: true, error: null });

        // Kiểm tra MCU status trước khi điều khiển
        const currentHomeId = homeId || get().currentHomeId;
        if (currentHomeId) {
          try {
            const mcuStatus = await mcuApi.checkMCUOnlineStatus(currentHomeId);
            set({ mcuStatus });

            if (!mcuStatus.hasMCU) {
              set({ isLoading: false });
              toast.error('Không thể điều khiển: Nhà chưa được kết nối với MCU Gateway');
              return;
            }

            if (!mcuStatus.isOnline) {
              set({ isLoading: false });
              toast.error(`Không thể điều khiển: ${mcuStatus.message}`);
              return;
            }
          } catch (mcuError) {
            console.warn('Failed to check MCU status, proceeding with control:', mcuError);
            // Continue with control even if MCU check fails - let backend handle it
          }
        }

        try {
          const response = await deviceApi.controlDevice(deviceId, action);
          console.log('controlDevice response:', response.data);

          // Fetch updated device status from backend after control
          try {
            const deviceResponse = await deviceApi.getDeviceById(deviceId);
            const updatedDevice = deviceResponse.data?.data || deviceResponse.data;

            if (updatedDevice) {
              // Extract status from stateValue first (most accurate), then fallback
              const statusFromStateValue = getDeviceStatusFromStateValue(updatedDevice.stateValue);
              const newStatus = statusFromStateValue || updatedDevice.deviceStatus || updatedDevice.status;

              set((state) => ({
                devices: state.devices.map((device) =>
                  device.id === deviceId.toString()
                    ? { ...device, status: newStatus, stateValue: updatedDevice.stateValue }
                    : device
                ),
                // Update current device if it's the one being controlled
                currentDevice:
                  state.currentDevice?.id === deviceId
                    ? { ...state.currentDevice, deviceStatus: newStatus, stateValue: updatedDevice.stateValue }
                    : state.currentDevice,
                isLoading: false,
              }));
            } else {
              // Fallback: Update local state based on action
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
                currentDevice:
                  state.currentDevice?.id === deviceId
                    ? { ...state.currentDevice, deviceStatus: newStatus }
                    : state.currentDevice,
                isLoading: false,
              }));
            }
          } catch (fetchError) {
            console.warn('Failed to fetch updated device status, using optimistic update:', fetchError);
            // Fallback: Update local state based on action
            let newStatus: DeviceStatus;
            if (action === 'TURN_ON') newStatus = DeviceStatus.ON;
            else if (action === 'TURN_OFF') newStatus = DeviceStatus.OFF;
            else {
              const device = get().devices.find(d => d.id === deviceId.toString());
              newStatus = device?.status === DeviceStatus.ON ? DeviceStatus.OFF : DeviceStatus.ON;
            }

            set((state) => ({
              devices: state.devices.map((device) =>
                device.id === deviceId.toString()
                  ? { ...device, status: newStatus }
                  : device
              ),
              currentDevice:
                state.currentDevice?.id === deviceId
                  ? { ...state.currentDevice, deviceStatus: newStatus }
                  : state.currentDevice,
              isLoading: false,
            }));
          }

          const actionText = action === 'TURN_ON' ? 'bật' : action === 'TURN_OFF' ? 'tắt' : 'chuyển đổi';
          toast.success(`Đã ${actionText} thiết bị thành công!`);
        } catch (error: any) {
          console.error('controlDevice error:', error);
          const errorMsg = getUserFriendlyError(error);
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

            toast.success('Đã cập nhật trạng thái thiết bị thành công!');
          }
        } catch (error: any) {
          console.error('updateDeviceStatus error:', error);
          const errorMsg = getUserFriendlyError(error);
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
          toast.success('Đã gửi lệnh thành công!');
        } catch (error: any) {
          console.error('sendCommand error:', error);
          const errorMsg = getUserFriendlyError(error);
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
                metadata: item.metadata,
                gpioPin: item.gpioPin,
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
          const errorMsg = getUserFriendlyError(error);
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
          const errorMsg = getUserFriendlyError(error);
          set({ error: errorMsg, isLoading: false });
          toast.error(errorMsg);
          return null;
        }
      },

      // MCU status methods
      checkMCUStatus: async (homeId: number) => {
        try {
          const status = await mcuApi.checkMCUOnlineStatus(homeId);
          set({ mcuStatus: status, currentHomeId: homeId });
          return status;
        } catch (error) {
          console.error('Failed to check MCU status:', error);
          const offlineStatus: MCUOnlineStatus = {
            hasMCU: false,
            isOnline: false,
            status: null,
            message: 'Không thể kiểm tra trạng thái MCU'
          };
          set({ mcuStatus: offlineStatus, currentHomeId: homeId });
          return offlineStatus;
        }
      },

      setMCUStatus: (status) => set({ mcuStatus: status }),

      // WebSocket update method - cập nhật device status từ WebSocket device-status topic
      updateDeviceFromWebSocket: (deviceStatusUpdate) => {
        const { gpioPin, deviceCode, status, stateValue } = deviceStatusUpdate;
        
        console.log('[DeviceStore] updateDeviceFromWebSocket called:', {
          gpioPin,
          deviceCode,
          status,
          stateValue,
          currentDevices: get().devices.map(d => ({
            id: d.id,
            deviceCode: d.deviceCode,
            gpioPin: d.gpioPin,
            status: d.status
          }))
        });
        
        set((state) => {
          // Tìm device theo GPIO pin hoặc deviceCode (case-insensitive)
          const deviceIndex = state.devices.findIndex((d) => {
            // Ưu tiên tìm bằng GPIO pin (chính xác nhất)
            if (gpioPin != null && d.gpioPin != null && d.gpioPin === gpioPin) {
              console.log('[DeviceStore] Found device by GPIO pin:', { gpioPin, deviceCode: d.deviceCode, id: d.id });
              return true;
            }
            // Fallback: tìm bằng deviceCode (case-insensitive, có thể match prefix)
            if (deviceCode && d.deviceCode) {
              const match = d.deviceCode.toUpperCase() === deviceCode.toUpperCase() ||
                           d.deviceCode.toUpperCase().includes(deviceCode.toUpperCase()) ||
                           deviceCode.toUpperCase().includes(d.deviceCode.toUpperCase());
              if (match) {
                console.log('[DeviceStore] Found device by deviceCode:', { 
                  searchCode: deviceCode, 
                  foundCode: d.deviceCode, 
                  gpioPin: d.gpioPin,
                  id: d.id 
                });
                return true;
              }
            }
            return false;
          });

          if (deviceIndex === -1) {
            console.warn('[DeviceStore] Device not found for WebSocket update:', { 
              gpioPin, 
              deviceCode,
              availableDevices: state.devices.map(d => ({
                id: d.id,
                deviceCode: d.deviceCode,
                gpioPin: d.gpioPin
              }))
            });
            return state;
          }

          // Tạo bản sao mới của device để đảm bảo React re-render
          const updatedDevices = [...state.devices];
          const device = { ...updatedDevices[deviceIndex] }; // Tạo shallow copy

          // Cập nhật status
          if (status) {
            const newStatus = status.toUpperCase() as DeviceStatus;
            device.status = newStatus;
          }

          // Cập nhật stateValue
          if (stateValue) {
            device.stateValue = stateValue;
            // Nếu có stateValue, extract status từ stateValue
            const statusFromStateValue = getDeviceStatusFromStateValue(stateValue);
            if (statusFromStateValue) {
              device.status = statusFromStateValue;
            }
          }

          // Tạo mảng mới với device đã cập nhật
          updatedDevices[deviceIndex] = device;

          console.log('[DeviceStore] Updated device from WebSocket:', {
            deviceCode: device.deviceCode,
            gpioPin: device.gpioPin,
            oldStatus: state.devices[deviceIndex].status,
            newStatus: device.status,
            stateValue: device.stateValue,
          });

          // Tạo state mới để đảm bảo React re-render
          const newState = {
            devices: updatedDevices,
            // Cập nhật currentDevice nếu đang xem device này
            currentDevice:
              state.currentDevice &&
              (state.currentDevice.id.toString() === device.id ||
                state.currentDevice.deviceCode === device.deviceCode)
                ? {
                    ...state.currentDevice,
                    status: device.status as DeviceStatus,
                    stateValue: device.stateValue,
                  }
                : state.currentDevice,
          };

          console.log('[DeviceStore] New state devices count:', newState.devices.length);
          return newState;
        });
      },

      // Utility methods
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      clearCurrentDevice: () => set({ currentDevice: null }),
      setDevices: (devices) => set({ devices }),
      reset: () => set({ ...initialState, mcuStatus: null, currentHomeId: null }),
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