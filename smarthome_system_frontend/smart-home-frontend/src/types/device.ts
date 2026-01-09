export enum DeviceType {
  LIGHT = 'LIGHT',
  FAN = 'FAN',
  SWITCH = 'SWITCH',
  SENSOR = 'SENSOR',
  THERMOSTAT = 'THERMOSTAT',
  CAMERA = 'CAMERA',
  LOCK = 'LOCK',
  PLUG = 'PLUG',
  TV = 'TV',
  SPEAKER = 'SPEAKER',
  OTHER = 'OTHER'
}

export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
  UNKNOWN = 'UNKNOWN',
  ON = 'ON',
  OFF = 'OFF'
}

export interface DeviceResponse {
  id: number;
  name: string;
  deviceCode: string;
  deviceType: DeviceType;
  deviceStatus: DeviceStatus;
  stateValue?: string;
  metadata?: string;
  roomId: number;
  roomName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  result?: T;
  timestamp: string;
}