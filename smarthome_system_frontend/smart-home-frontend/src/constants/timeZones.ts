export interface TimeZoneOption {
  value: string;
  label: string;
  offset: string;
  region: string;
}

export const TIME_ZONES: TimeZoneOption[] = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Việt Nam (GMT+7)', offset: '+07:00', region: 'Asia' },
  { value: 'Asia/Bangkok', label: 'Thái Lan (GMT+7)', offset: '+07:00', region: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapore (GMT+8)', offset: '+08:00', region: 'Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (GMT+8)', offset: '+08:00', region: 'Asia' },
  { value: 'Asia/Shanghai', label: 'Trung Quốc (GMT+8)', offset: '+08:00', region: 'Asia' },
  { value: 'Asia/Taipei', label: 'Đài Loan (GMT+8)', offset: '+08:00', region: 'Asia' },
  { value: 'Asia/Seoul', label: 'Hàn Quốc (GMT+9)', offset: '+09:00', region: 'Asia' },
  { value: 'Asia/Tokyo', label: 'Nhật Bản (GMT+9)', offset: '+09:00', region: 'Asia' },
  { value: 'Australia/Perth', label: 'Úc (Perth GMT+8)', offset: '+08:00', region: 'Australia' },
  { value: 'Australia/Sydney', label: 'Úc (Sydney GMT+10)', offset: '+10:00', region: 'Australia' },
  { value: 'Pacific/Auckland', label: 'New Zealand (GMT+12)', offset: '+12:00', region: 'Pacific' },
  { value: 'Europe/London', label: 'Anh (GMT+0)', offset: '+00:00', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Pháp (GMT+1)', offset: '+01:00', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Đức (GMT+1)', offset: '+01:00', region: 'Europe' },
  { value: 'Europe/Moscow', label: 'Nga (Moscow GMT+3)', offset: '+03:00', region: 'Europe' },
  { value: 'America/New_York', label: 'USA (New York GMT-5)', offset: '-05:00', region: 'America' },
  { value: 'America/Chicago', label: 'USA (Chicago GMT-6)', offset: '-06:00', region: 'America' },
  { value: 'America/Denver', label: 'USA (Denver GMT-7)', offset: '-07:00', region: 'America' },
  { value: 'America/Los_Angeles', label: 'USA (Los Angeles GMT-8)', offset: '-08:00', region: 'America' },
  { value: 'America/Toronto', label: 'Canada (Toronto GMT-5)', offset: '-05:00', region: 'America' },
  { value: 'America/Sao_Paulo', label: 'Brazil (GMT-3)', offset: '-03:00', region: 'America' },
];

// Nhóm múi giờ theo khu vực
export const TIME_ZONES_BY_REGION = {
  Asia: TIME_ZONES.filter(tz => tz.region === 'Asia'),
  Europe: TIME_ZONES.filter(tz => tz.region === 'Europe'),
  America: TIME_ZONES.filter(tz => tz.region === 'America'),
  Australia: TIME_ZONES.filter(tz => tz.region === 'Australia'),
  Pacific: TIME_ZONES.filter(tz => tz.region === 'Pacific'),
};

// Tìm múi giờ theo giá trị
export const getTimeZoneByValue = (value: string): TimeZoneOption | undefined => {
  return TIME_ZONES.find(tz => tz.value === value);
};

// Múi giờ mặc định (Việt Nam)
export const DEFAULT_TIME_ZONE = 'Asia/Ho_Chi_Minh';