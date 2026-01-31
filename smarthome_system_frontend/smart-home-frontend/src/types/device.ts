export enum DeviceType {
  LIGHT = 'LIGHT',
  DOOR = 'DOOR',
  AIR_CONDITIONER = 'AIR_CONDITIONER',
  FAN = 'FAN',
  CAMERA = 'CAMERA',
  SENSOR = 'SENSOR',
  SWITCH = 'SWITCH',
  CURTAIN = 'CURTAIN',
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
  /**
   * GPIO pin number trên ESP32 tương ứng với device này
   * null nếu device không có GPIO mapping
   */
  gpioPin?: number | null;
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