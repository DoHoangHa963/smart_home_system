/**
 * MCU Gateway API Service
 * 
 * Provides API methods for managing ESP32 MCU Gateway operations including:
 * - Pairing initialization and confirmation
 * - Gateway information retrieval
 * - Gateway unpairing
 */

import api from '../api';
import { useAuthStore } from '@/store/authStore';
import type {
  MCUGateway,
  MCUInitPairingRequest,
  MCUPairingRequest,
  MCUPairingInitResponse,
  MCUPairingResponse,
  MCUSensorDataResponse,
  DashboardDataResponse
} from '@/types/mcu';

const MCU_BASE_URL = '/mcu';

export const mcuApi = {
  /**
   * Initialize MCU Gateway pairing process
   * Creates MCU in PAIRING state and returns available homes
   * 
   * @param request - MCU device information
   * @returns Pairing init response with available homes list
   */
  initPairing: async (request: MCUInitPairingRequest) => {
    const response = await api.post<{ data: MCUPairingInitResponse }>(
      `${MCU_BASE_URL}/init-pairing`,
      request
    );
    return response.data;
  },

  /**
   * Manual pairing with specific home
   * Creates MCU Gateway associated with the specified home
   * 
   * @param homeId - Target home ID
   * @param request - MCU device information
   * @returns Pairing response (without API key until confirmed)
   */
  pairWithHome: async (homeId: number, request: MCUPairingRequest) => {
    const response = await api.post<{ data: MCUPairingResponse }>(
      `${MCU_BASE_URL}/pair/${homeId}`,
      request
    );
    return response.data;
  },

  /**
   * Confirm pairing after user selection
   * Generates API key and completes the pairing process
   * 
   * @param mcuGatewayId - MCU Gateway ID from init-pairing
   * @param homeId - Selected home ID
   * @returns Pairing response with API key
   */
  confirmPairing: async (mcuGatewayId: number, homeId: number) => {
    const response = await api.post<{ data: MCUPairingResponse }>(
      `${MCU_BASE_URL}/confirm/${mcuGatewayId}/home/${homeId}`
    );
    return response.data;
  },

  /**
   * Get MCU Gateway information for a specific home
   * 
   * @param homeId - Home ID to query
   * @returns MCU Gateway details or null if not found
   */
  getByHomeId: async (homeId: number) => {
    try {
      const response = await api.get<{ data: MCUGateway }>(
        `${MCU_BASE_URL}/home/${homeId}`
      );
      return response.data;
    } catch (error: any) {
      // Return null if MCU not found (404)
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Check if a home has an MCU Gateway connected
   * 
   * @param homeId - Home ID to check
   * @returns true if MCU is connected, false otherwise
   */
  checkMCUConnection: async (homeId: number): Promise<boolean> => {
    try {
      const response = await mcuApi.getByHomeId(homeId);
      return response !== null && response.data !== null;
    } catch {
      return false;
    }
  },

  /**
   * Check if MCU Gateway is online and ready to receive commands
   * 
   * @param homeId - Home ID to check
   * @returns MCU status info including isOnline flag
   */
  checkMCUOnlineStatus: async (homeId: number): Promise<MCUOnlineStatus> => {
    try {
      const response = await mcuApi.getByHomeId(homeId);
      console.log('[MCU Status Check] Full response:', JSON.stringify(response, null, 2));

      if (response === null || response.data === null) {
        return {
          hasMCU: false,
          isOnline: false,
          status: null,
          message: 'Nhà chưa được kết nối với MCU Gateway'
        };
      }

      const mcu = response.data;

      // Debug logging - check all properties
      console.log('[MCU Status Check] Response data:', mcu);
      console.log('[MCU Status Check] MCU object keys:', Object.keys(mcu));
      console.log('[MCU Status Check] MCU properties:', {
        id: mcu.id,
        serialNumber: mcu.serialNumber,
        status: mcu.status,
        isOnline: mcu.isOnline,
        'isOnline type': typeof mcu.isOnline,
        'has isOnline': 'isOnline' in mcu,
        lastHeartbeat: mcu.lastHeartbeat,
        hasLastHeartbeat: mcu.lastHeartbeat != null
      });

      // Backend đã tính isOnline dựa trên heartbeat trong vòng 5 phút
      // Frontend chỉ cần kiểm tra thêm:
      // 1. Status không phải PAIRING (đã được confirm pairing)
      // 2. Có lastHeartbeat (đã từng gửi heartbeat)
      // 3. Backend isOnline = true (heartbeat trong vòng 5 phút)
      const isOnline = mcu.isOnline &&
        mcu.status !== 'PAIRING' &&
        mcu.lastHeartbeat != null;

      console.log('[MCU Status Check] Result:', {
        isOnline, reason: {
          backendIsOnline: mcu.isOnline,
          statusNotPairing: mcu.status !== 'PAIRING',
          hasLastHeartbeat: mcu.lastHeartbeat != null
        }
      });

      return {
        hasMCU: true,
        isOnline,
        status: mcu.status,
        lastHeartbeat: mcu.lastHeartbeat,
        message: isOnline
          ? 'MCU đang hoạt động'
          : mcu.status === 'PAIRING'
            ? 'MCU đang trong quá trình ghép nối'
            : !mcu.lastHeartbeat
              ? 'MCU chưa gửi heartbeat. Đảm bảo ESP32 đã nhận API Key và đang kết nối WiFi.'
              : !mcu.isOnline
                ? `MCU mất kết nối (heartbeat cuối: ${mcu.lastHeartbeat ? new Date(mcu.lastHeartbeat).toLocaleString('vi-VN') : 'N/A'}). Kiểm tra thiết bị ESP32.`
                : 'MCU không phản hồi. Kiểm tra kết nối WiFi của thiết bị.'
      };
    } catch {
      return {
        hasMCU: false,
        isOnline: false,
        status: null,
        message: 'Không thể kiểm tra trạng thái MCU'
      };
    }
  },

  /**
   * Unpair MCU Gateway from home
   * Revokes API key and sets status to OFFLINE
   * 
   * @param mcuGatewayId - MCU Gateway ID to unpair
   */
  unpair: async (mcuGatewayId: number) => {
    const response = await api.delete(`${MCU_BASE_URL}/${mcuGatewayId}`);
    return response.data;
  },

  /**
   * Send API Key to ESP32 via backend proxy
   * Backend will forward the request to ESP32 to avoid CORS issues
   * 
   * @param esp32IpAddress - IP address of ESP32
   * @param apiKey - API Key to send
   * @param mcuGatewayId - MCU Gateway ID
   * @param homeId - Home ID
   */
  sendApiKeyToESP32: async (
    esp32IpAddress: string,
    apiKey: string,
    mcuGatewayId: number,
    homeId: number
  ) => {
    const response = await api.post<{ data: string }>(
      `${MCU_BASE_URL}/send-api-key`,
      {
        esp32IpAddress,
        apiKey,
        mcuGatewayId,
        homeId,
      }
    );
    return response.data;
  },

  /**
   * Get sensor data from MCU Gateway for a specific home
   * 
   * @param homeId - Home ID to query
   * @returns Sensor data from MCU Gateway
   */
  getSensorDataByHomeId: async (homeId: number) => {
    try {
      const response = await api.get<{ data: MCUSensorDataResponse }>(
        `${MCU_BASE_URL}/home/${homeId}/sensor-data`
      );
      return response.data;
    } catch (error: any) {
      // Return null if sensor data not found
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },


  /**
   * Trigger ESP32 to send heartbeat immediately
   * 
   * @param homeId - Home ID
   * @returns Success message
   */
  triggerHeartbeat: async (homeId: number) => {
    const response = await api.post<{ data: string }>(
      `${MCU_BASE_URL}/home/${homeId}/trigger-heartbeat`
    );
    return response.data;
  },

  /**
   * Get full dashboard data: trigger heartbeat and return all dashboard data
   * Includes sensor data and device statistics
   * 
   * @param homeId - Home ID
   * @returns Full dashboard data
   */
  getDashboardData: async (homeId: number) => {
    const response = await api.post<{ data: DashboardDataResponse }>(
      `${MCU_BASE_URL}/home/${homeId}/dashboard-data`
    );
    return response.data;
  },

  /**
   * Get available GPIO pins from ESP32 MCU Gateway
   * Frontend uses this to display GPIO pin selection when adding devices
   * Similar to Virtual Pins in Blynk
   * 
   * @param homeId - Home ID to query
   * @returns List of available GPIO pins with their info
   */
  getAvailableGPIOPins: async (homeId: number): Promise<GPIOPinsResponse | null> => {
    try {
      const response = await api.get<{ data: GPIOPinsResponse }>(
        `${MCU_BASE_URL}/home/${homeId}/gpio-pins`
      );
      return response.data?.data || null;
    } catch (error: any) {
      console.error('Failed to get GPIO pins:', error);
      // Return null if MCU not connected or error
      if (error.response?.status === 404 || error.response?.status === 502) {
        return null;
      }
      throw error;
    }
  },
  /**
   * Toggle automation setting on ESP32
   * 
   * @param homeId - Home ID
   * @param automationType - AUTO_LIGHT, AUTO_FAN, or AUTO_CLOSE_DOOR
   * @param enabled - Whether to enable the automation
   * @returns API response
   */
  toggleAutomation: async (
    homeId: number,
    automationType: 'AUTO_LIGHT' | 'AUTO_FAN' | 'AUTO_CLOSE_DOOR',
    enabled: boolean
  ) => {
    const response = await api.post<{ data: string }>(
      `${MCU_BASE_URL}/home/${homeId}/automation/toggle`,
      { automationType, enabled }
    );
    return response.data;
  },

  /**
   * Set automation thresholds on ESP32
   * 
   * @param homeId - Home ID
   * @param lightThreshold - Light threshold (0-4095, null to skip)
   * @param tempThreshold - Temperature threshold (0-50°C, null to skip)
   * @param gasThreshold - Gas threshold (0-4095, null to skip)
   * @returns API response
   */
  setAutomationConfig: async (
    homeId: number,
    lightThreshold?: number | null,
    tempThreshold?: number | null,
    gasThreshold?: number | null
  ) => {
    const response = await api.post<{ data: string }>(
      `${MCU_BASE_URL}/home/${homeId}/automation/config`,
      { lightThreshold, tempThreshold, gasThreshold }
    );
    return response.data;
  },
};

/**
 * MCU Online Status check result
 */
export interface MCUOnlineStatus {
  hasMCU: boolean;
  isOnline: boolean;
  status: 'PAIRING' | 'ONLINE' | 'OFFLINE' | 'ERROR' | null;
  lastHeartbeat?: string;
  message: string;
}

/**
 * GPIO Pin information from ESP32
 */
export interface GPIOPin {
  gpio: number;
  name: string;
  code: string;
  type: 'OUTPUT' | 'INPUT_ANALOG' | 'INPUT_DIGITAL';
  deviceType: string;
  controllable: boolean;
  currentState?: string;
  currentValue?: number | boolean;
  tempIn?: number;
  humIn?: number;
  tempOut?: number;
  humOut?: number;
}

export interface GPIOPinsResponse {
  pins: GPIOPin[];
  totalPins: number;
  controllablePins: number;
  sensorPins: number;
  serialNumber: string;
}

// ============ RFID API ============

import type {
  RFIDCardsListResponse,
  RFIDLearnRequest,
  RFIDLearnStatusResponse,
  RFIDCardUpdateRequest,
  RFIDAccessLog,
  RFIDAccessStats
} from '@/types/rfid';

/**
 * RFID Management API
 */
export const rfidApi = {
  /**
   * Get list of RFID cards from ESP32
   * 
   * @param homeId - Home ID
   * @returns List of RFID cards
   */
  getCardsList: async (homeId: number): Promise<RFIDCardsListResponse> => {
    const response = await api.get<{ data: RFIDCardsListResponse }>(
      `${MCU_BASE_URL}/home/${homeId}/rfid/cards`
    );
    return response.data.data;
  },

  /**
   * Start RFID learning mode
   * 
   * @param homeId - Home ID
   * @param request - Optional request with card name
   * @returns Learning status response
   */
  startLearning: async (homeId: number, request?: RFIDLearnRequest): Promise<RFIDLearnStatusResponse> => {
    const response = await api.post<{ data: RFIDLearnStatusResponse }>(
      `${MCU_BASE_URL}/home/${homeId}/rfid/learn`,
      request || {}
    );
    return response.data.data;
  },

  /**
   * Get RFID learning status
   * 
   * @param homeId - Home ID
   * @returns Learning status response
   */
  getLearningStatus: async (homeId: number): Promise<RFIDLearnStatusResponse> => {
    const response = await api.get<{ data: RFIDLearnStatusResponse }>(
      `${MCU_BASE_URL}/home/${homeId}/rfid/learn/status`
    );
    return response.data.data;
  },

  /**
   * Update RFID card information
   * 
   * @param homeId - Home ID
   * @param request - Update request with index, name, enabled
   */
  updateCard: async (homeId: number, request: RFIDCardUpdateRequest): Promise<void> => {
    await api.put(`${MCU_BASE_URL}/home/${homeId}/rfid/cards`, request);
  },

  /**
   * Delete RFID card by index
   * 
   * @param homeId - Home ID
   * @param index - Card index to delete
   */
  deleteCard: async (homeId: number, index: number): Promise<void> => {
    await api.delete(`${MCU_BASE_URL}/home/${homeId}/rfid/cards/${index}`);
  },

  /**
   * Clear all RFID cards
   * 
   * @param homeId - Home ID
   */
  clearAllCards: async (homeId: number): Promise<void> => {
    await api.post(`${MCU_BASE_URL}/home/${homeId}/rfid/clear`);
  },

  /**
   * Get RFID access logs (paginated)
   * 
   * @param homeId - Home ID
   * @param page - Page number (0-based)
   * @param size - Page size
   * @returns Paginated access logs
   */
  getAccessLogs: async (homeId: number, page = 0, size = 20) => {
    const response = await api.get<{ data: { content: RFIDAccessLog[], totalElements: number, totalPages: number } }>(
      `${MCU_BASE_URL}/home/${homeId}/rfid/access-logs`,
      { params: { page, size } }
    );
    return response.data.data;
  },

  /**
   * Get recent RFID access logs (last 10)
   * 
   * @param homeId - Home ID
   * @returns List of recent access logs
   */
  getRecentAccessLogs: async (homeId: number): Promise<RFIDAccessLog[]> => {
    const response = await api.get<{ data: RFIDAccessLog[] }>(
      `${MCU_BASE_URL}/home/${homeId}/rfid/access-logs/recent`
    );
    return response.data.data;
  },

  /**
   * Get RFID access statistics
   * 
   * @param homeId - Home ID
   * @returns Access statistics
   */
  getAccessStats: async (homeId: number): Promise<RFIDAccessStats> => {
    const response = await api.get<{ data: RFIDAccessStats }>(
      `${MCU_BASE_URL}/home/${homeId}/rfid/stats`
    );
    return response.data.data;
  },

};

export default mcuApi;
