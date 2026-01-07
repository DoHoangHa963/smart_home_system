export type Role = 'owner' | 'admin' | 'member' | 'guest';

export type DeviceType = 'light' | 'fan' | 'ac' | 'tv' | 'lock';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  joinDate: string;
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: 'on' | 'off';
  room: string;
  value?: number; // Ví dụ: nhiệt độ, độ sáng (optional)
}