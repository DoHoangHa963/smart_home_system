/**
 * MCU Gateway Types for Smart Home System
 * 
 * These types represent the ESP32 MCU Gateway entities and their operations.
 */

/**
 * MCU Gateway status enumeration
 */
export type MCUStatus = 'PAIRING' | 'ONLINE' | 'OFFLINE' | 'ERROR';

/**
 * MCU Gateway response from API
 */
export interface MCUGateway {
  id: number;
  serialNumber: string;
  name: string;
  ipAddress?: string;
  firmwareVersion?: string;
  status: MCUStatus;
  lastHeartbeat?: string;
  pairedAt?: string;
  pairedByUsername?: string;
  homeId: number;
  homeName: string;
  metadata?: string;
  isOnline: boolean;
}

/**
 * Request to initialize MCU pairing
 */
export interface MCUInitPairingRequest {
  serialNumber: string;
  homeId: number;  // Required - Home ID mà MCU sẽ được pair với
  name?: string;
  ipAddress?: string;
  firmwareVersion?: string;
  metadata?: string;
}

/**
 * Request for manual MCU pairing with specific home
 */
export interface MCUPairingRequest {
  serialNumber: string;
  name: string;
  ipAddress?: string;
  firmwareVersion?: string;
  metadata?: string;
}

/**
 * Home info returned in pairing init response
 */
export interface AvailableHome {
  id: number;
  name: string;
  address?: string;
  memberCount: number;
  roomCount: number;
}

/**
 * Response when initializing pairing
 */
export interface MCUPairingInitResponse {
  mcuGatewayId: number;
  serialNumber: string;
  name: string;
  homeId: number;
  homeName: string;
  availableHomes?: AvailableHome[];  // Deprecated
  message: string;
}

/**
 * Response after successful pairing
 */
export interface MCUPairingResponse {
  apiKey?: string;
  mcuGatewayId: number;
  homeId: number;
  message: string;
}

/**
 * Heartbeat request from MCU
 */
export interface MCUHeartbeatRequest {
  serialNumber?: string;
  ipAddress?: string;
  firmwareVersion?: string;
  status?: string;
}

/**
 * Sensor data response from MCU Gateway
 */
export interface MCUSensorDataResponse {
  mcuGatewayId: number;
  serialNumber: string;
  lastUpdate?: string;
  tempIn?: number;
  humIn?: number;
  tempOut?: number;
  humOut?: number;
  gas?: number;
  light?: number;
  rain?: number;
  flame?: boolean;
  motion?: boolean;
  door?: boolean;
  lightStatus?: boolean;
  fanStatus?: boolean;
  gasAlert?: boolean;
  emergency?: boolean;
  // Automation configuration
  autoLight?: boolean;
  autoFan?: boolean;
  autoCloseDoor?: boolean;
  autoLightThreshold?: number;
  autoFanThreshold?: number;
  gasAlertThreshold?: number;
  rawData?: Record<string, any>;
}

/**
 * Device statistics for dashboard
 */
export interface DeviceStatistics {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  devicesByType: Record<string, number>;
  devicesByStatus: Record<string, number>;
  topDevices: Array<{
    id: number;
    name: string;
    deviceCode: string;
    deviceType: string;
    deviceStatus: string;
    stateValue?: string;
    roomId?: number;
    roomName?: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
}

/**
 * Full dashboard data response - includes sensor data and device statistics
 */
export interface DashboardDataResponse {
  sensorData: MCUSensorDataResponse;
  statistics: DeviceStatistics;
}
