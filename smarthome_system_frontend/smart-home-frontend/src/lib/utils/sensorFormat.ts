/**
 * Utility functions để format và hiển thị giá trị cảm biến
 * một cách thân thiện với người dùng
 */

export interface SensorDisplayInfo {
  value: string;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  icon?: string;
  percentage?: number;
}

// ==================== GAS SENSOR ====================
// Giá trị analog 0-4095, giá trị cao = nồng độ gas cao
export function formatGasValue(value: number | undefined | null, gasAlert?: boolean): SensorDisplayInfo {
  if (value === undefined || value === null) {
    return {
      value: 'N/A',
      label: 'Không có dữ liệu',
      description: 'Chưa nhận được dữ liệu từ cảm biến',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
    };
  }

  // Nếu có cảnh báo từ MCU
  if (gasAlert) {
    return {
      value: `${value}`,
      label: 'NGUY HIỂM',
      description: 'Phát hiện khí gas nguy hiểm! Kiểm tra ngay!',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      percentage: Math.min(100, (value / 4095) * 100),
    };
  }

  if (value < 400) {
    return {
      value: `${value}`,
      label: 'An toàn',
      description: 'Chất lượng không khí tốt',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      percentage: Math.min(100, (value / 4095) * 100),
    };
  } else if (value < 700) {
    return {
      value: `${value}`,
      label: 'Cảnh báo nhẹ',
      description: 'Nồng độ khí gas hơi cao, nên thông gió',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      percentage: Math.min(100, (value / 4095) * 100),
    };
  } else if (value < 1000) {
    return {
      value: `${value}`,
      label: 'Cảnh báo',
      description: 'Nồng độ khí gas cao, cần thông gió ngay',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      percentage: Math.min(100, (value / 4095) * 100),
    };
  } else {
    return {
      value: `${value}`,
      label: 'NGUY HIỂM',
      description: 'Nồng độ khí gas rất cao! Kiểm tra rò rỉ!',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      percentage: Math.min(100, (value / 4095) * 100),
    };
  }
}

// ==================== LIGHT SENSOR ====================
// Giá trị analog 0-4095, giá trị CAO = ánh sáng YẾU (inversed)
export function formatLightValue(value: number | undefined | null): SensorDisplayInfo {
  if (value === undefined || value === null) {
    return {
      value: 'N/A',
      label: 'Không có dữ liệu',
      description: 'Chưa nhận được dữ liệu từ cảm biến',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
    };
  }

  // Chuyển đổi để hiển thị % ánh sáng (inversed)
  const lightPercentage = Math.max(0, Math.min(100, ((4095 - value) / 4095) * 100));

  if (value > 3500) {
    return {
      value: `${Math.round(lightPercentage)}%`,
      label: 'Rất tối',
      description: 'Gần như không có ánh sáng',
      color: 'text-gray-700',
      bgColor: 'bg-gray-200',
      percentage: lightPercentage,
    };
  } else if (value > 2500) {
    return {
      value: `${Math.round(lightPercentage)}%`,
      label: 'Tối',
      description: 'Ánh sáng yếu, cần bật đèn',
      color: 'text-slate-600',
      bgColor: 'bg-slate-100',
      percentage: lightPercentage,
    };
  } else if (value > 1500) {
    return {
      value: `${Math.round(lightPercentage)}%`,
      label: 'Mờ',
      description: 'Ánh sáng vừa phải',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      percentage: lightPercentage,
    };
  } else if (value > 500) {
    return {
      value: `${Math.round(lightPercentage)}%`,
      label: 'Sáng',
      description: 'Ánh sáng đầy đủ',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      percentage: lightPercentage,
    };
  } else {
    return {
      value: `${Math.round(lightPercentage)}%`,
      label: 'Rất sáng',
      description: 'Ánh sáng mạnh, có thể cần che chắn',
      color: 'text-orange-500',
      bgColor: 'bg-orange-100',
      percentage: lightPercentage,
    };
  }
}

// ==================== RAIN SENSOR ====================
// Giá trị analog 0-4095, giá trị THẤP = có mưa (inversed)
export function formatRainValue(value: number | undefined | null): SensorDisplayInfo {
  if (value === undefined || value === null) {
    return {
      value: 'N/A',
      label: 'Không có dữ liệu',
      description: 'Chưa nhận được dữ liệu từ cảm biến',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
    };
  }

  // Chuyển đổi để hiển thị mức độ mưa (inversed)
  const rainPercentage = Math.max(0, Math.min(100, ((4095 - value) / 4095) * 100));

  if (value > 3500) {
    return {
      value: 'Không mưa',
      label: 'Khô ráo',
      description: 'Thời tiết khô, không có mưa',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      percentage: rainPercentage,
    };
  } else if (value > 2500) {
    return {
      value: 'Ẩm nhẹ',
      label: 'Hơi ẩm',
      description: 'Có hơi ẩm hoặc sương, chưa mưa',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      percentage: rainPercentage,
    };
  } else if (value > 1500) {
    return {
      value: 'Mưa nhẹ',
      label: 'Mưa phùn',
      description: 'Đang mưa nhẹ hoặc mưa phùn',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      percentage: rainPercentage,
    };
  } else if (value > 500) {
    return {
      value: 'Mưa vừa',
      label: 'Đang mưa',
      description: 'Mưa vừa, nên đóng cửa sổ',
      color: 'text-blue-700',
      bgColor: 'bg-blue-200',
      percentage: rainPercentage,
    };
  } else {
    return {
      value: 'Mưa to',
      label: 'Mưa lớn',
      description: 'Mưa rất to, kiểm tra cửa sổ',
      color: 'text-indigo-700',
      bgColor: 'bg-indigo-200',
      percentage: rainPercentage,
    };
  }
}

// ==================== TEMPERATURE ====================
export function formatTemperature(value: number | undefined | null, isOutdoor: boolean = false): SensorDisplayInfo {
  if (value === undefined || value === null) {
    return {
      value: 'N/A',
      label: 'Không có dữ liệu',
      description: 'Chưa nhận được dữ liệu từ cảm biến',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
    };
  }

  const formattedValue = `${value.toFixed(1)}°C`;

  if (value < 15) {
    return {
      value: formattedValue,
      label: 'Rất lạnh',
      description: isOutdoor ? 'Ngoài trời rất lạnh, mặc ấm' : 'Phòng quá lạnh, cần sưởi ấm',
      color: 'text-blue-700',
      bgColor: 'bg-blue-200',
    };
  } else if (value < 20) {
    return {
      value: formattedValue,
      label: 'Mát',
      description: isOutdoor ? 'Ngoài trời mát mẻ' : 'Nhiệt độ phòng mát',
      color: 'text-blue-500',
      bgColor: 'bg-blue-100',
    };
  } else if (value < 26) {
    return {
      value: formattedValue,
      label: 'Dễ chịu',
      description: isOutdoor ? 'Thời tiết dễ chịu' : 'Nhiệt độ phòng lý tưởng',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    };
  } else if (value < 32) {
    return {
      value: formattedValue,
      label: 'Ấm',
      description: isOutdoor ? 'Ngoài trời ấm áp' : 'Phòng hơi ấm, có thể bật quạt',
      color: 'text-orange-500',
      bgColor: 'bg-orange-100',
    };
  } else if (value < 38) {
    return {
      value: formattedValue,
      label: 'Nóng',
      description: isOutdoor ? 'Ngoài trời nóng bức' : 'Phòng nóng, nên bật điều hòa',
      color: 'text-orange-600',
      bgColor: 'bg-orange-200',
    };
  } else {
    return {
      value: formattedValue,
      label: 'Rất nóng',
      description: isOutdoor ? 'Ngoài trời cực kỳ nóng, hạn chế ra ngoài' : 'Phòng quá nóng, bật điều hòa ngay',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    };
  }
}

// ==================== HUMIDITY ====================
export function formatHumidity(value: number | undefined | null): SensorDisplayInfo {
  if (value === undefined || value === null) {
    return {
      value: 'N/A',
      label: 'Không có dữ liệu',
      description: 'Chưa nhận được dữ liệu từ cảm biến',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
    };
  }

  const formattedValue = `${value.toFixed(0)}%`;

  if (value < 30) {
    return {
      value: formattedValue,
      label: 'Quá khô',
      description: 'Không khí quá khô, nên dùng máy tạo ẩm',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      percentage: value,
    };
  } else if (value < 40) {
    return {
      value: formattedValue,
      label: 'Hơi khô',
      description: 'Độ ẩm hơi thấp',
      color: 'text-blue-400',
      bgColor: 'bg-blue-50',
      percentage: value,
    };
  } else if (value < 60) {
    return {
      value: formattedValue,
      label: 'Thoải mái',
      description: 'Độ ẩm lý tưởng cho sức khỏe',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      percentage: value,
    };
  } else if (value < 70) {
    return {
      value: formattedValue,
      label: 'Hơi ẩm',
      description: 'Độ ẩm cao, có thể hơi nóng bức',
      color: 'text-blue-500',
      bgColor: 'bg-blue-100',
      percentage: value,
    };
  } else if (value < 80) {
    return {
      value: formattedValue,
      label: 'Ẩm',
      description: 'Độ ẩm cao, nên bật điều hòa hoặc hút ẩm',
      color: 'text-blue-600',
      bgColor: 'bg-blue-200',
      percentage: value,
    };
  } else {
    return {
      value: formattedValue,
      label: 'Rất ẩm',
      description: 'Độ ẩm quá cao, cần hút ẩm',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-200',
      percentage: value,
    };
  }
}

// ==================== MOTION SENSOR ====================
export function formatMotionStatus(detected: boolean | undefined | null): SensorDisplayInfo {
  if (detected === undefined || detected === null) {
    return {
      value: 'N/A',
      label: 'Không có dữ liệu',
      description: 'Chưa nhận được dữ liệu từ cảm biến',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
    };
  }

  if (detected) {
    return {
      value: 'Có',
      label: 'Phát hiện chuyển động',
      description: 'Có người hoặc vật thể di chuyển',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    };
  } else {
    return {
      value: 'Không',
      label: 'Yên tĩnh',
      description: 'Không phát hiện chuyển động',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    };
  }
}

// ==================== FLAME SENSOR ====================
export function formatFlameStatus(detected: boolean | undefined | null): SensorDisplayInfo {
  if (detected === undefined || detected === null) {
    return {
      value: 'N/A',
      label: 'Không có dữ liệu',
      description: 'Chưa nhận được dữ liệu từ cảm biến',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
    };
  }

  if (detected) {
    return {
      value: 'PHÁT HIỆN',
      label: 'CẢNH BÁO LỬA',
      description: 'Phát hiện lửa! Kiểm tra ngay lập tức!',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    };
  } else {
    return {
      value: 'An toàn',
      label: 'Bình thường',
      description: 'Không phát hiện lửa',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    };
  }
}

// ==================== DOOR SENSOR ====================
export function formatDoorStatus(isOpen: boolean | undefined | null): SensorDisplayInfo {
  if (isOpen === undefined || isOpen === null) {
    return {
      value: 'N/A',
      label: 'Không có dữ liệu',
      description: 'Chưa nhận được dữ liệu từ cảm biến',
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
    };
  }

  if (isOpen) {
    return {
      value: 'Mở',
      label: 'Cửa đang mở',
      description: 'Cửa chính đang ở trạng thái mở',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    };
  } else {
    return {
      value: 'Đóng',
      label: 'Cửa đã đóng',
      description: 'Cửa chính đã được đóng',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    };
  }
}

// ==================== DEVICE STATUS ====================
export function formatDeviceStatus(isOn: boolean | undefined | null, deviceName: string): SensorDisplayInfo {
  if (isOn === undefined || isOn === null) {
    return {
      value: 'N/A',
      label: 'Không có dữ liệu',
      description: `Chưa nhận được trạng thái ${deviceName}`,
      color: 'text-gray-500',
      bgColor: 'bg-gray-100',
    };
  }

  if (isOn) {
    return {
      value: 'BẬT',
      label: `${deviceName} đang bật`,
      description: `${deviceName} đang hoạt động`,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    };
  } else {
    return {
      value: 'TẮT',
      label: `${deviceName} đã tắt`,
      description: `${deviceName} không hoạt động`,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    };
  }
}

// ==================== EMERGENCY STATUS ====================
export function formatEmergencyStatus(isEmergency: boolean | undefined | null): SensorDisplayInfo {
  if (isEmergency === undefined || isEmergency === null) {
    return {
      value: 'Bình thường',
      label: 'Hệ thống ổn định',
      description: 'Không có tình huống khẩn cấp',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    };
  }

  if (isEmergency) {
    return {
      value: 'KHẨN CẤP',
      label: 'TÌNH TRẠNG KHẨN CẤP',
      description: 'Có tình huống khẩn cấp! Kiểm tra ngay!',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    };
  } else {
    return {
      value: 'Bình thường',
      label: 'Hệ thống ổn định',
      description: 'Không có tình huống khẩn cấp',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    };
  }
}

// ==================== TIME FORMATTING ====================
export function formatLastUpdate(dateString: string | undefined | null): string {
  if (!dateString) return 'Chưa có dữ liệu';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 30) {
      return 'Vừa xong';
    } else if (diffSecs < 60) {
      return `${diffSecs} giây trước`;
    } else if (diffMins < 60) {
      return `${diffMins} phút trước`;
    } else if (diffHours < 24) {
      return `${diffHours} giờ trước`;
    } else if (diffDays < 7) {
      return `${diffDays} ngày trước`;
    } else {
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  } catch {
    return 'Không xác định';
  }
}
