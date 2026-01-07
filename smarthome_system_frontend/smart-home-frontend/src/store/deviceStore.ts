import { create } from 'zustand';
import { Device } from '@/types';

// Mock Data chuẩn TS
const MOCK_DEVICES: Device[] = [
  { id: '1', name: 'Đèn trần', type: 'light', status: 'on', room: 'Phòng khách' },
  { id: '2', name: 'Quạt đứng', type: 'fan', status: 'off', room: 'Phòng ngủ' },
  { id: '3', name: 'Smart TV', type: 'tv', status: 'off', room: 'Phòng khách' },
  { id: '4', name: 'Điều hòa', type: 'ac', status: 'on', room: 'Phòng ngủ', value: 24 },
  { id: '5', name: 'Cổng chính', type: 'lock', status: 'on', room: 'Sân vườn' },
  { id: '6', name: 'Đèn bàn', type: 'light', status: 'off', room: 'Phòng làm việc' },
];

interface DeviceState {
  devices: Device[];
  isLoading: boolean;
  toggleDevice: (id: string) => void;
  // Các actions khác...
}

export const useDeviceStore = create<DeviceState>((set) => ({
  devices: MOCK_DEVICES,
  isLoading: false,

  toggleDevice: (id) => set((state) => ({
    devices: state.devices.map((d) =>
      d.id === id ? { ...d, status: d.status === 'on' ? 'off' : 'on' } : d
    )
  })),
}));