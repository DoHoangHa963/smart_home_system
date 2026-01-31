import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import {
  Zap, Droplets, Thermometer, Activity,
  Home, Moon, Sun, Shield, Play,
  AlertCircle, CheckCircle2, Clock,
  BarChart3, TrendingUp, Download, Users,
  RefreshCw, Wind, Lightbulb, CloudRain, Flame,
  Move, DoorOpen, Fan
} from 'lucide-react';
import { useHomeStore } from '@/store/homeStore';
import { usePermission } from '@/hooks/usePermission';
import { deviceApi } from '@/lib/api/device.api';
import { mcuApi, MCUOnlineStatus } from '@/lib/api/mcu.api';
import { homeApi } from '@/lib/api/home.api';
import type { RecentActivity } from '@/types/admin';
import { DeviceStatus } from '@/types/device';
import { HOME_PERMISSIONS } from '@/types/permission';
import type { MCUSensorDataResponse } from '@/types/mcu';
import { toast } from 'sonner';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  formatGasValue,
  formatLightValue,
  formatRainValue,
  formatTemperature,
  formatHumidity,
  formatMotionStatus,
  formatFlameStatus,
  formatDoorStatus,
  formatDeviceStatus,
  formatLastUpdate,
} from '@/lib/utils/sensorFormat';
import { webSocketService } from '@/lib/websocket';
import { useEmergencyNotification } from '@/hooks/useEmergencyNotification';

// --- Types & Helper Functions ---
interface ActivityLog {
  id: string;
  action: string;
  time: string;
  type: 'info' | 'warning' | 'success';
}

// Helper function để format timestamp thành relative time
const formatRelativeTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Vừa xong';
    } else if (diffMins < 60) {
      return `${diffMins} phút trước`;
    } else if (diffHours < 24) {
      return `${diffHours} giờ trước`;
    } else if (diffDays < 7) {
      return `${diffDays} ngày trước`;
    } else {
      // Format date: "HH:mm" hoặc "dd/MM/yyyy HH:mm" nếu quá cũ
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');

      if (diffDays < 365) {
        return `${day}/${month} ${hours}:${minutes}`;
      } else {
        const year = date.getFullYear();
        return `${day}/${month}/${year} ${hours}:${minutes}`;
      }
    }
  } catch (e) {
    return timestamp;
  }
};

// Helper function để map RecentActivity sang ActivityLog
const mapToActivityLog = (activity: RecentActivity): ActivityLog => {
  const typeMap: Record<string, 'info' | 'warning' | 'success'> = {
    'INFO': 'info',
    'WARNING': 'warning',
    'ERROR': 'warning', // Error cũng hiển thị như warning
    'SUCCESS': 'success',
  };

  return {
    id: activity.id.toString(),
    action: activity.description,
    time: formatRelativeTime(activity.timestamp),
    type: typeMap[activity.type] || 'info',
  };
};

const SCENES = [
  { id: 'home', name: 'Về nhà', icon: <Home className="h-6 w-6" />, color: 'text-blue-500 bg-blue-100' },
  { id: 'away', name: 'Ra ngoài', icon: <Shield className="h-6 w-6" />, color: 'text-slate-500 bg-slate-100' },
  { id: 'night', name: 'Đi ngủ', icon: <Moon className="h-6 w-6" />, color: 'text-indigo-500 bg-indigo-100' },
  { id: 'morning', name: 'Thức dậy', icon: <Sun className="h-6 w-6" />, color: 'text-orange-500 bg-orange-100' },
];

// --- Sub-components ---

// 1. Thẻ thống kê nhỏ (Stat Card) - Cải tiến để hiển thị thông tin cảm biến
interface StatCardProps {
  title: string;
  value: string;
  subtext?: string;
  description?: string;
  icon: React.ReactNode;
  trend?: string;
  valueColor?: string;
}

const StatCard = ({ title, value, subtext, description, icon, trend, valueColor }: StatCardProps) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-6 flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <h3 className={`text-2xl font-bold tracking-tight ${valueColor || ''}`}>{value}</h3>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
        {description && (
          <p className="text-xs text-muted-foreground mt-1 italic">{description}</p>
        )}
      </div>
      <div className={`p-3 rounded-xl ${trend || 'bg-primary/10 text-primary'}`}>
        {icon}
      </div>
    </CardContent>
  </Card>
);

// Sensor card component với progress bar
interface SensorCardProps {
  title: string;
  value: string;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  percentage?: number;
  icon?: React.ReactNode;
}

const SensorCard = ({ title, value, label, description, color, bgColor, percentage, icon }: SensorCardProps) => (
  <div className={`p-4 border rounded-lg bg-card hover:shadow-sm transition-all`}>
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm text-muted-foreground font-medium">{title}</p>
      <div className={`p-1.5 rounded-lg ${bgColor}`}>
        {icon}
      </div>
    </div>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    <p className={`text-sm font-medium ${color} mt-1`}>{label}</p>
    <p className="text-xs text-muted-foreground mt-1">{description}</p>
    {percentage !== undefined && (
      <div className="mt-2 w-full bg-muted rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${percentage > 70 ? 'bg-red-500' : percentage > 40 ? 'bg-yellow-500' : 'bg-green-500'
            }`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    )}
  </div>
);

// 2. Main Dashboard Component
export default function Dashboard() {
  const [energyUsage, setEnergyUsage] = useState(65); // Mock 65%
  const { currentHome } = useHomeStore();
  const { can } = usePermission();

  // Statistics state
  const [statistics, setStatistics] = useState({
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    devicesByType: {} as Record<string, number>,
    devicesByStatus: {} as Record<string, number>,
    topDevices: [] as any[],
  });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Sensor data state
  // Helper function để lấy localStorage key cho sensor data
  const getSensorDataStorageKey = (homeId: number) => `sensorData_${homeId}`;

  // Restore sensor data từ localStorage khi component mount
  const [sensorData, setSensorData] = useState<MCUSensorDataResponse | null>(() => {
    if (currentHome) {
      try {
        const storageKey = `sensorData_${currentHome.id}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Chỉ restore nếu data không quá cũ (dưới 1 giờ)
          const lastUpdate = parsed?.lastUpdate ? new Date(parsed.lastUpdate).getTime() : 0;
          const oneHourAgo = Date.now() - 60 * 60 * 1000;
          if (lastUpdate > oneHourAgo) {
            console.log('[Dashboard] Restored sensor data from localStorage:', parsed);
            return parsed;
          }
        }
      } catch (e) {
        console.warn('[Dashboard] Failed to restore sensor data from localStorage:', e);
      }
    }
    return null;
  });
  const [isLoadingSensorData, setIsLoadingSensorData] = useState(false);
  const [isTriggeringHeartbeat, setIsTriggeringHeartbeat] = useState(false);

  // MCU status state
  const [mcuStatus, setMcuStatus] = useState<MCUOnlineStatus | null>(null);
  const [dataStale, setDataStale] = useState(false); // Dữ liệu cũ khi MCU offline
  const [lastWebSocketDataTime, setLastWebSocketDataTime] = useState<number | null>(null); // Timestamp của WebSocket data gần nhất

  // Recent activities state
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  // Emergency notification hook
  const { emergency } = useEmergencyNotification();

  // Restore sensor data từ localStorage khi home thay đổi
  useEffect(() => {
    if (currentHome && !sensorData) {
      try {
        const storageKey = `sensorData_${currentHome.id}`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Chỉ restore nếu data không quá cũ (dưới 1 giờ)
          const lastUpdate = parsed?.lastUpdate ? new Date(parsed.lastUpdate).getTime() : 0;
          const oneHourAgo = Date.now() - 60 * 60 * 1000;
          if (lastUpdate > oneHourAgo) {
            console.log('[Dashboard] Restored sensor data from localStorage when home changed:', parsed);
            setSensorData(parsed);
            setDataStale(true); // Đánh dấu là stale data
          }
        }
      } catch (e) {
        console.warn('[Dashboard] Failed to restore sensor data from localStorage:', e);
      }
    }
  }, [currentHome?.id]);

  // Load recent activities
  const loadRecentActivities = async () => {
    if (!currentHome) return;

    setIsLoadingActivities(true);
    try {
      const response = await homeApi.getRecentActivities(currentHome.id, 10);
      const activities = response.data || [];
      const mappedActivities = activities.map(mapToActivityLog);
      setRecentActivities(mappedActivities);
    } catch (error) {
      console.error('[Dashboard] Failed to load recent activities:', error);
      // Nếu lỗi, vẫn giữ empty array (không hiển thị mock data)
      setRecentActivities([]);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  // Load statistics when home changes and user has permission
  useEffect(() => {
    if (currentHome && can(HOME_PERMISSIONS.HOME_LOGS_VIEW)) {
      loadStatistics();
      // Load initial sensor data
      loadSensorData();
      // Check MCU status
      checkMCUStatus();
      // Load recent activities
      loadRecentActivities();
    }
  }, [currentHome?.id]);

  // Auto-refresh statistics and recent activities định kỳ
  useEffect(() => {
    if (!currentHome || !can(HOME_PERMISSIONS.HOME_LOGS_VIEW)) return;

    // Refresh ngay lập tức lần đầu (đã được load ở useEffect trên, nhưng đảm bảo)
    // Tạo interval để tự động refresh mỗi 30 giây
    const refreshInterval = setInterval(() => {
      loadStatistics();
      loadRecentActivities();
      
      // Polling fallback cho sensor data nếu WebSocket không hoạt động
      // Chỉ poll nếu không nhận được WebSocket data trong 1 phút
      const lastWsTime = lastWebSocketDataTimeRef.current;
      const mcuStatus = mcuStatusRef.current;
      
      if (lastWsTime) {
        const timeSinceLastData = Date.now() - lastWsTime;
        const pollingThreshold = 60 * 1000; // 1 phút
        if (timeSinceLastData > pollingThreshold) {
          // WebSocket có vẻ không hoạt động, dùng polling
          loadSensorData();
        }
      } else if (mcuStatus?.hasMCU && mcuStatus?.isOnline) {
        // Có MCU nhưng chưa có WebSocket data, dùng polling
        loadSensorData();
      }
    }, 30000); // 30 giây

    return () => clearInterval(refreshInterval);
  }, [currentHome?.id]);

  // Kiểm tra MCU status định kỳ
  // Tối ưu: Khi không có MCU, check ít thường xuyên hơn (60s) để giảm request
  // Khi có MCU, check thường xuyên hơn (15s) để theo dõi trạng thái
  useEffect(() => {
    if (!currentHome) return;

    // Check ngay lập tức lần đầu
    checkMCUStatus();

    // Sử dụng interval dài hơn (60s) để giảm request khi không có MCU
    // Nếu có MCU, sẽ được điều chỉnh trong checkMCUStatus
    const interval = setInterval(() => {
      checkMCUStatus();
    }, 60000); // Default 60s - sẽ được điều chỉnh nếu có MCU

    return () => clearInterval(interval);
  }, [currentHome?.id]);

  // Kiểm tra dữ liệu có stale không (> 2 phút không cập nhật)
  useEffect(() => {
    if (!sensorData?.lastUpdate) {
      setDataStale(false);
      return;
    }

    const checkStale = () => {
      const lastUpdate = new Date(sensorData.lastUpdate).getTime();
      const now = Date.now();
      const staleThreshold = 2 * 60 * 1000; // 2 phút
      setDataStale(now - lastUpdate > staleThreshold);
    };

    checkStale();
    const interval = setInterval(checkStale, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, [sensorData?.lastUpdate]);

  const checkMCUStatus = async () => {
    if (!currentHome) return;

    try {
      const status = await mcuApi.checkMCUOnlineStatus(currentHome.id);
      setMcuStatus(status);
      mcuStatusRef.current = status; // Cập nhật ref

      // Cập nhật flag để biết có MCU hay không
      mcuNotFoundRef.current = !status.hasMCU;

      // Nếu không có MCU, chỉ đánh dấu - KHÔNG xóa data cũ
      // (Data cũ vẫn hữu ích để user biết trạng thái cuối)

      // Nếu MCU offline, đánh dấu dữ liệu là stale
      if (!status.isOnline && status.hasMCU) {
        setDataStale(true);
      }
    } catch (error) {
      console.error('Failed to check MCU status:', error);
      // Nếu lỗi, giả sử không có MCU để tránh spam request
      mcuNotFoundRef.current = true;
    }
  };

  const mcuNotFoundRef = useRef(false); // Flag để đánh dấu MCU không tồn tại
  const lastWebSocketDataTimeRef = useRef<number | null>(null); // Ref để track WebSocket data time
  const mcuStatusRef = useRef<MCUOnlineStatus | null>(null); // Ref để track MCU status

  // Computed: Xác định MCU có thực sự offline không
  // MCU được coi là offline nếu:
  // 1. Không có MCU (hasMCU = false), HOẶC
  // 2. Có MCU nhưng không nhận được WebSocket data trong 2 phút VÀ mcuStatus.isOnline = false
  const isMCUActuallyOffline = (): boolean => {
    if (!mcuStatus) return false; // Chưa có thông tin

    // Nếu không có MCU, coi là "offline" (chưa setup)
    if (!mcuStatus.hasMCU) return true;

    // Nếu có MCU nhưng API báo offline
    if (!mcuStatus.isOnline) {
      // Kiểm tra xem có nhận được WebSocket data gần đây không (trong 2 phút)
      if (lastWebSocketDataTime) {
        const timeSinceLastData = Date.now() - lastWebSocketDataTime;
        const offlineThreshold = 2 * 60 * 1000; // 2 phút
        // Nếu nhận được data trong 2 phút gần đây, coi như vẫn online
        if (timeSinceLastData < offlineThreshold) {
          return false; // Vẫn online vì có data gần đây
        }
      }
      // Không có data gần đây và API báo offline -> thực sự offline
      return true;
    }

    // MCU online theo API
    return false;
  };

  // WebSocket subscription for real-time sensor data
  useEffect(() => {
    if (!currentHome || !can(HOME_PERMISSIONS.HOME_LOGS_VIEW)) {
      return;
    }

    // Load initial data
    loadSensorData();

    // Subscribe to WebSocket
    // Topic: /topic/home/{homeId}/sensors
    const topic = `/topic/home/${currentHome.id}/sensors`;

    // Connect and subscribe
    webSocketService.activate();

    // Need a small delay to ensure connection or handle re-sub inside service
    // For now, valid implementation using the service wrapper
    const subId = webSocketService.subscribe(topic, (message) => {
      console.log('[WebSocket] Received sensor update:', message);
      // Message payload matches MCUSensorDataResponse structure (or partial)
      // Here we assume it's the full JSON payload
      try {
        // Need to parse if it comes as string, though service handles JSON parsing
        const sensorData = typeof message === 'string' ? JSON.parse(message) : message;

        // Map to MCUSensorDataResponse if needed, or just use if it matches
        // Backend sends raw JSON structure that matches what we expect
        setSensorData(sensorData);
        setDataStale(false);
        const now = Date.now();
        setLastWebSocketDataTime(now); // Track thời gian nhận data gần nhất
        lastWebSocketDataTimeRef.current = now; // Cập nhật ref

        // Cập nhật MCU status là online khi nhận được WebSocket data
        setMcuStatus(prev => {
          const newStatus: MCUOnlineStatus = prev
            ? { ...prev, isOnline: true, status: 'ONLINE' as const, message: 'Online' }
            : { hasMCU: true, isOnline: true, status: 'ONLINE' as const, message: 'Online' };
          mcuStatusRef.current = newStatus; // Cập nhật ref
          return newStatus;
        });

        // Lưu vào localStorage khi nhận data từ WebSocket
        if (currentHome) {
          try {
            localStorage.setItem(getSensorDataStorageKey(currentHome.id), JSON.stringify(sensorData));
          } catch (e) {
            console.warn('[Dashboard] Failed to save sensor data to localStorage:', e);
          }
        }

        // Emergency is now handled by useEmergencyNotification hook
      } catch (e) {
        console.error('Error processing WebSocket message', e);
      }
    });

    // Subscribe to status updates as well
    const statusTopic = `/topic/home/${currentHome.id}/status`;
    const statusSubId = webSocketService.subscribe(statusTopic, (message) => {
      console.log('[WebSocket] Received status update:', message);
      // message is "online" or "offline" string
      if (message === 'online') {
        const now = Date.now();
        setMcuStatus(prev => {
          const newStatus: MCUOnlineStatus = prev ? { ...prev, isOnline: true, status: 'ONLINE' as const, message: 'Online' } : { hasMCU: true, isOnline: true, status: 'ONLINE' as const, message: 'Online' };
          mcuStatusRef.current = newStatus;
          return newStatus;
        });
        setDataStale(false);
        setLastWebSocketDataTime(now); // Track khi nhận status online
        lastWebSocketDataTimeRef.current = now;
      } else if (message === 'offline') {
        // Chỉ đánh dấu offline nếu không nhận được data trong 2 phút
        // (Có thể là tạm thời offline nhưng vẫn có data cũ)
        setMcuStatus(prev => {
          const newStatus: MCUOnlineStatus = prev ? { ...prev, isOnline: false, status: 'OFFLINE' as const, message: 'Offline' } : { hasMCU: true, isOnline: false, status: 'OFFLINE' as const, message: 'Offline' };
          mcuStatusRef.current = newStatus;
          return newStatus;
        });
        // Không set dataStale ngay - để logic check stale tự xử lý
      }
    });

    return () => {
      webSocketService.unsubscribe(subId);
      webSocketService.unsubscribe(statusSubId);
      // Optional: deactivate if no other components use it
      // webSocketService.deactivate(); 
    };
  }, [currentHome?.id]);

  const loadSensorData = async () => {
    if (!currentHome) return;

    // Nếu đã biết không có MCU, không cần load sensor data
    // Nhưng KHÔNG xóa data cũ - giữ nguyên để hiển thị
    if (mcuNotFoundRef.current) {
      return;
    }

    setIsLoadingSensorData(true);
    try {
      const response = await mcuApi.getSensorDataByHomeId(currentHome.id);
      console.log('[Dashboard] Sensor data API response:', response);

      // Response structure: { data: MCUSensorDataResponse }
      if (response && response.data) {
        const sensorData = response.data;
        console.log('[Dashboard] Parsed sensor data:', {
          mcuGatewayId: sensorData.mcuGatewayId,
          serialNumber: sensorData.serialNumber,
          tempIn: sensorData.tempIn,
          tempOut: sensorData.tempOut,
          humIn: sensorData.humIn,
          humOut: sensorData.humOut,
          gas: sensorData.gas,
          light: sensorData.light,
          lastUpdate: sensorData.lastUpdate,
          rawData: sensorData.rawData
        });
        setSensorData(sensorData);
        // Lưu vào localStorage để restore khi MCU offline
        if (currentHome) {
          try {
            localStorage.setItem(getSensorDataStorageKey(currentHome.id), JSON.stringify(sensorData));
          } catch (e) {
            console.warn('[Dashboard] Failed to save sensor data to localStorage:', e);
          }
        }
      } else {
        console.warn('[Dashboard] No sensor data in response:', response);
        // KHÔNG xóa data cũ - giữ nguyên để hiển thị với stale indicator
      }
    } catch (error: any) {
      console.error('[Dashboard] Failed to load sensor data:', error);
      console.error('[Dashboard] Error details:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        data: error.response?.data
      });

      // Nếu lỗi 404 (MCU not found), không hiển thị error và đánh dấu không có MCU
      if (error.response?.status === 404) {
        console.log('[Dashboard] MCU not found for home:', currentHome.id);
        mcuNotFoundRef.current = true;
      } else {
        console.warn('[Dashboard] Sensor data not available:', error.response?.data?.message || error.message);
        // Khi MCU offline, restore data từ localStorage nếu có
        if (currentHome && !sensorData) {
          try {
            const storageKey = `sensorData_${currentHome.id}`;
            const stored = localStorage.getItem(storageKey);
            if (stored) {
              const parsed = JSON.parse(stored);
              console.log('[Dashboard] Restored sensor data from localStorage after API error:', parsed);
              setSensorData(parsed);
              setDataStale(true); // Đánh dấu data là stale
            }
          } catch (e) {
            console.warn('[Dashboard] Failed to restore sensor data from localStorage:', e);
          }
        }
      }
      // KHÔNG xóa data cũ - giữ nguyên để hiển thị với stale indicator
    } finally {
      setIsLoadingSensorData(false);
    }
  };

  const loadStatistics = async () => {
    if (!currentHome) return;

    setIsLoadingStats(true);
    try {
      // Fetch all devices for the home
      const response = await deviceApi.getDevicesByHome(currentHome.id, 0, 1000);
      const devicesData = response.data?.data?.content || [];

      // Calculate statistics
      const totalDevices = devicesData.length;
      const onlineDevices = devicesData.filter((d: any) =>
        d.deviceStatus === DeviceStatus.ON || d.status === DeviceStatus.ON
      ).length;
      const offlineDevices = devicesData.filter((d: any) =>
        d.deviceStatus === DeviceStatus.OFF || d.status === DeviceStatus.OFF
      ).length;

      // Count by type
      const devicesByType: Record<string, number> = {};
      devicesData.forEach((device: any) => {
        const type = device.deviceType || device.type || 'UNKNOWN';
        devicesByType[type] = (devicesByType[type] || 0) + 1;
      });

      // Count by status
      const devicesByStatus: Record<string, number> = {};
      devicesData.forEach((device: any) => {
        const status = device.deviceStatus || device.status || 'UNKNOWN';
        devicesByStatus[status] = (devicesByStatus[status] || 0) + 1;
      });

      // Top devices (sorted by last update or most used)
      const topDevices = devicesData
        .sort((a: any, b: any) => {
          const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return dateB - dateA;
        })
        .slice(0, 5);

      setStatistics({
        totalDevices,
        onlineDevices,
        offlineDevices,
        devicesByType,
        devicesByStatus,
        topDevices,
      });
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleExportReport = () => {
    if (!currentHome) return;

    const reportData = {
      home: {
        name: currentHome.name,
        address: currentHome.address,
        timeZone: currentHome.timeZone,
        createdAt: currentHome.createdAt,
      },
      statistics: {
        ...statistics,
        memberCount: currentHome.memberCount,
        roomCount: currentHome.roomCount,
      },
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `home-statistics-${currentHome.name}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Đã xuất báo cáo thành công');
  };

  const handleTriggerHeartbeat = async () => {
    if (!currentHome) return;

    setIsTriggeringHeartbeat(true);
    setIsLoadingSensorData(true);
    setIsLoadingStats(true);

    try {
      // Kiểm tra MCU status trước
      const currentMcuStatus = await mcuApi.checkMCUOnlineStatus(currentHome.id);
      setMcuStatus(currentMcuStatus);

      // Nếu không có MCU hoặc MCU offline
      if (!currentMcuStatus.hasMCU) {
        toast.warning('Nhà chưa được kết nối với MCU Gateway. Vui lòng ghép nối ESP32 trước.');
        // Vẫn load statistics
        await loadStatistics();
        return;
      }

      if (!currentMcuStatus.isOnline) {
        toast.warning(`MCU Gateway đang offline. ${currentMcuStatus.message}`);
        setDataStale(true);
        // Vẫn load statistics
        await loadStatistics();
        return;
      }

      // MCU online - Gọi endpoint tổng hợp để lấy tất cả data dashboard
      const response = await mcuApi.getDashboardData(currentHome.id);

      if (response?.data) {
        const dashboardData = response.data;

        // Cập nhật sensor data
        if (dashboardData.sensorData) {
          setSensorData(dashboardData.sensorData);
          setDataStale(false); // Reset stale flag khi có dữ liệu mới
          // Lưu vào localStorage
          if (currentHome) {
            try {
              localStorage.setItem(getSensorDataStorageKey(currentHome.id), JSON.stringify(dashboardData.sensorData));
            } catch (e) {
              console.warn('[Dashboard] Failed to save sensor data to localStorage:', e);
            }
          }
          toast.success('Đã tải dữ liệu cảm biến mới nhất từ MCU!');
        } else {
          toast.warning('MCU online nhưng chưa có dữ liệu cảm biến. Đợi ESP32 gửi dữ liệu...');
        }

        // Cập nhật statistics
        if (dashboardData.statistics) {
          setStatistics({
            totalDevices: dashboardData.statistics.totalDevices,
            onlineDevices: dashboardData.statistics.onlineDevices,
            offlineDevices: dashboardData.statistics.offlineDevices,
            devicesByType: dashboardData.statistics.devicesByType,
            devicesByStatus: dashboardData.statistics.devicesByStatus,
            topDevices: dashboardData.statistics.topDevices,
          });
        }
      } else {
        toast.error('Không nhận được dữ liệu từ server');
      }

    } catch (error: any) {
      console.error('Failed to get dashboard data:', error);
      const errorMsg = error.response?.data?.message || 'Không thể tải dữ liệu dashboard';
      toast.error(errorMsg);
    } finally {
      setIsTriggeringHeartbeat(false);
      setIsLoadingSensorData(false);
      setIsLoadingStats(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Emergency Alert Banner */}
      {emergency && emergency.isActive && (
        <Alert variant="destructive" className="border-2 border-red-600 animate-pulse">
          <AlertTriangle className="h-5 w-5" />
          <AlertDescription className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-bold text-lg mb-1">
                {emergency.type === 'FIRE' && '🚨 PHÁT HIỆN LỬA!'}
                {emergency.type === 'GAS' && '⚠️ RÒ RỈ KHÍ GAS!'}
                {emergency.type === 'BOTH' && '🚨 KHẨN CẤP: LỬA VÀ KHÍ GAS!'}
                {emergency.type !== 'FIRE' && emergency.type !== 'GAS' && emergency.type !== 'BOTH' && '🚨 CẢNH BÁO KHẨN CẤP!'}
              </div>
              <div>
                {emergency.type === 'FIRE' && 'Cảm biến lửa đã phát hiện có lửa trong nhà. Vui lòng sơ tán ngay lập tức!'}
                {emergency.type === 'GAS' && 'Cảm biến khí gas đã phát hiện rò rỉ. Vui lòng thông gió và kiểm tra ngay!'}
                {emergency.type === 'BOTH' && 'Phát hiện đồng thời lửa và rò rỉ khí gas. Sơ tán ngay lập tức!'}
                {emergency.type !== 'FIRE' && emergency.type !== 'GAS' && emergency.type !== 'BOTH' && 'Có tình huống khẩn cấp xảy ra trong nhà. Vui lòng kiểm tra ngay!'}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/notifications'}
              className="ml-4"
            >
              Xem chi tiết
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {/* --- Section 1: Header & Greeting --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Chào buổi sáng, Admin!</h1>
            <p className="text-muted-foreground">Hôm nay trời nắng đẹp, nhiệt độ ngoài trời là 28°C.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportReport}>Báo cáo</Button>
          <Button
            variant="outline"
            onClick={handleTriggerHeartbeat}
            disabled={isTriggeringHeartbeat || !currentHome}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isTriggeringHeartbeat ? 'animate-spin' : ''}`} />
            {isTriggeringHeartbeat ? 'Đang tải...' : 'Lấy dữ liệu ngay'}
          </Button>
        </div>
      </div>

      {/* --- Section 2: Quick Stats (Responsive Grid) --- */}
      {(() => {
        const tempInInfo = formatTemperature(sensorData?.tempIn, false);
        const tempOutInfo = formatTemperature(sensorData?.tempOut, true);
        const humInInfo = formatHumidity(sensorData?.humIn);
        const humOutInfo = formatHumidity(sensorData?.humOut);
        const gasInfo = formatGasValue(sensorData?.gas, sensorData?.gasAlert);
        const motionInfo = formatMotionStatus(sensorData?.motion);

        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Nhiệt độ trong nhà"
              value={tempInInfo.value}
              subtext={`${tempInInfo.label} • Độ ẩm: ${humInInfo.value}`}
              description={tempInInfo.description}
              icon={<Thermometer className="h-5 w-5" />}
              trend={tempInInfo.bgColor + ' ' + tempInInfo.color}
              valueColor={tempInInfo.color}
            />
            <StatCard
              title="Thiết bị đang bật"
              value={statistics.onlineDevices.toString()}
              subtext={`Trên tổng số ${statistics.totalDevices} thiết bị`}
              description={statistics.onlineDevices > 0 ? 'Hệ thống đang hoạt động' : 'Tất cả thiết bị đã tắt'}
              icon={<Zap className="h-5 w-5" />}
              trend="bg-yellow-100 text-yellow-600"
              valueColor={statistics.onlineDevices > 0 ? 'text-green-600' : 'text-gray-600'}
            />
            <StatCard
              title="Nhiệt độ ngoài trời"
              value={tempOutInfo.value}
              subtext={`${tempOutInfo.label} • Độ ẩm: ${humOutInfo.value}`}
              description={tempOutInfo.description}
              icon={<Activity className="h-5 w-5" />}
              trend={tempOutInfo.bgColor + ' ' + tempOutInfo.color}
              valueColor={tempOutInfo.color}
            />
            <StatCard
              title="An toàn khí gas"
              value={gasInfo.label}
              subtext={`Nồng độ: ${gasInfo.value} • ${motionInfo.label}`}
              description={gasInfo.description}
              icon={<Droplets className="h-5 w-5" />}
              trend={gasInfo.bgColor + ' ' + gasInfo.color}
              valueColor={gasInfo.color}
            />
          </div>
        );
      })()}


      {/* --- Section 3: Split Layout (Main Content + Sidebar) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (2/3): Scenes & Energy */}
        <div className="lg:col-span-2 space-y-6">

          {/* Quick Scenes */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Ngữ cảnh nhanh</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {SCENES.map((scene) => (
                <Card key={scene.id} className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <div className={`p-3 rounded-full transition-transform group-hover:scale-110 ${scene.color}`}>
                      {scene.icon}
                    </div>
                    <div>
                      <span className="font-semibold block">{scene.name}</span>
                      <span className="text-xs text-muted-foreground">Kích hoạt</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* MCU Status Alerts */}
          {mcuStatus && !mcuStatus.isOnline && mcuStatus.hasMCU && (
            <Alert className="bg-orange-50 border-orange-200">
              <AlertDescription className="text-orange-800 flex items-center">
                <WifiOff className="h-4 w-4 mr-2 flex-shrink-0" />
                <span><strong>MCU Gateway đang offline.</strong> {mcuStatus.message}</span>
              </AlertDescription>
            </Alert>
          )}

          {mcuStatus && !mcuStatus.hasMCU && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-yellow-800 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                <span><strong>Chưa kết nối MCU Gateway.</strong> Vui lòng ghép nối thiết bị ESP32 để xem dữ liệu cảm biến.</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Sensor Data Widget */}
          {sensorData && (
            <Card className={dataStale || isMCUActuallyOffline() ? 'opacity-75 border-orange-200' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Dữ liệu cảm biến từ ESP32
                      {(dataStale || isMCUActuallyOffline()) && (
                        <Badge variant="outline" className="ml-2 text-orange-600 border-orange-300 bg-orange-50">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Dữ liệu cũ
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      {!isMCUActuallyOffline() ? (
                        <>
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                          <span>Đang cập nhật</span>
                        </>
                      ) : (
                        <>
                          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                          <span className="text-red-600">MCU Offline</span>
                        </>
                      )}
                      {' • '}Cập nhật: {formatLastUpdate(sensorData.lastUpdate)}
                      {dataStale && <span className="text-orange-500 ml-1">(đã lâu)</span>}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Cảnh báo khẩn cấp */}
                {sensorData.emergency && (
                  <div className="mb-4 p-4 bg-red-100 border-2 border-red-400 rounded-lg animate-pulse">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-6 w-6 text-red-600" />
                      <p className="text-red-800 font-bold text-lg">TÌNH TRẠNG KHẨN CẤP!</p>
                    </div>
                    <p className="text-red-700 text-sm mt-1">
                      Hệ thống phát hiện tình huống nguy hiểm. Vui lòng kiểm tra ngay!
                    </p>
                  </div>
                )}

                {/* Grid cảm biến với format thân thiện */}
                {(() => {
                  const gasInfo = formatGasValue(sensorData.gas, sensorData.gasAlert);
                  const lightInfo = formatLightValue(sensorData.light);
                  const rainInfo = formatRainValue(sensorData.rain);
                  const motionInfo = formatMotionStatus(sensorData.motion);
                  const flameInfo = formatFlameStatus(sensorData.flame);
                  const doorInfo = formatDoorStatus(sensorData.door);
                  const lightDeviceInfo = formatDeviceStatus(sensorData.lightStatus, 'Đèn');
                  const fanDeviceInfo = formatDeviceStatus(sensorData.fanStatus, 'Quạt');

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Cảm biến khí gas */}
                      <SensorCard
                        title="Khí Gas"
                        value={gasInfo.value}
                        label={gasInfo.label}
                        description={gasInfo.description}
                        color={gasInfo.color}
                        bgColor={gasInfo.bgColor}
                        percentage={gasInfo.percentage}
                        icon={<Wind className={`h-4 w-4 ${gasInfo.color}`} />}
                      />

                      {/* Cảm biến ánh sáng */}
                      <SensorCard
                        title="Ánh sáng"
                        value={lightInfo.value}
                        label={lightInfo.label}
                        description={lightInfo.description}
                        color={lightInfo.color}
                        bgColor={lightInfo.bgColor}
                        percentage={lightInfo.percentage}
                        icon={<Sun className={`h-4 w-4 ${lightInfo.color}`} />}
                      />

                      {/* Cảm biến mưa */}
                      <SensorCard
                        title="Thời tiết"
                        value={rainInfo.value}
                        label={rainInfo.label}
                        description={rainInfo.description}
                        color={rainInfo.color}
                        bgColor={rainInfo.bgColor}
                        percentage={rainInfo.percentage}
                        icon={<CloudRain className={`h-4 w-4 ${rainInfo.color}`} />}
                      />

                      {/* Cảm biến lửa */}
                      <SensorCard
                        title="Phát hiện lửa"
                        value={flameInfo.value}
                        label={flameInfo.label}
                        description={flameInfo.description}
                        color={flameInfo.color}
                        bgColor={flameInfo.bgColor}
                        icon={<Flame className={`h-4 w-4 ${flameInfo.color}`} />}
                      />

                      {/* Cảm biến chuyển động */}
                      <SensorCard
                        title="Chuyển động"
                        value={motionInfo.value}
                        label={motionInfo.label}
                        description={motionInfo.description}
                        color={motionInfo.color}
                        bgColor={motionInfo.bgColor}
                        icon={<Move className={`h-4 w-4 ${motionInfo.color}`} />}
                      />

                      {/* Trạng thái cửa */}
                      <SensorCard
                        title="Cửa chính"
                        value={doorInfo.value}
                        label={doorInfo.label}
                        description={doorInfo.description}
                        color={doorInfo.color}
                        bgColor={doorInfo.bgColor}
                        icon={<DoorOpen className={`h-4 w-4 ${doorInfo.color}`} />}
                      />

                      {/* Trạng thái đèn */}
                      <SensorCard
                        title="Đèn"
                        value={lightDeviceInfo.value}
                        label={lightDeviceInfo.label}
                        description={lightDeviceInfo.description}
                        color={lightDeviceInfo.color}
                        bgColor={lightDeviceInfo.bgColor}
                        icon={<Lightbulb className={`h-4 w-4 ${lightDeviceInfo.color}`} />}
                      />

                      {/* Trạng thái quạt */}
                      <SensorCard
                        title="Quạt"
                        value={fanDeviceInfo.value}
                        label={fanDeviceInfo.label}
                        description={fanDeviceInfo.description}
                        color={fanDeviceInfo.color}
                        bgColor={fanDeviceInfo.bgColor}
                        icon={<Fan className={`h-4 w-4 ${fanDeviceInfo.color}`} />}
                      />
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {!sensorData && !isLoadingSensorData && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  Dữ liệu cảm biến
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  {mcuStatus?.hasMCU ? (
                    !isMCUActuallyOffline() ? (
                      <>
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                        MCU đang kết nối, đang chờ dữ liệu...
                      </>
                    ) : (
                      <>
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
                        <span className="text-red-600">MCU Gateway đang offline - {mcuStatus.message}</span>
                      </>
                    )
                  ) : (
                    <>
                      <span className="inline-block w-2 h-2 rounded-full bg-gray-400" />
                      Chưa kết nối MCU Gateway
                    </>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <WifiOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium mb-2">Chưa có dữ liệu cảm biến</p>
                  <p className="text-sm">
                    {mcuStatus?.hasMCU
                      ? (!isMCUActuallyOffline()
                        ? 'Đang chờ dữ liệu từ ESP32. Nếu không có dữ liệu sau vài phút, kiểm tra ESP32 đã nhận API Key chưa.'
                        : mcuStatus.status === 'PAIRING'
                          ? 'MCU đang trong quá trình ghép nối. Vui lòng hoàn tất ghép nối và gửi API Key đến ESP32.'
                          : 'MCU Gateway offline. Kiểm tra: 1) ESP32 đã nhận API Key chưa? 2) ESP32 có kết nối WiFi không? 3) ESP32 có cùng mạng với backend không?')
                      : 'Vui lòng ghép nối thiết bị ESP32 với nhà này. Vào trang MCU Setup để bắt đầu.'}
                  </p>
                  {!mcuStatus?.hasMCU && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => window.location.href = `/mcu/setup?homeId=${currentHome?.id}`}
                    >
                      Ghép nối MCU Gateway
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Right Column (1/3): Activity Log */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Hoạt động gần đây
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-[600px] px-6">
                {isLoadingActivities ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : recentActivities.length > 0 ? (
                  <div className="space-y-6 pb-6">
                    {recentActivities.map((log, index) => (
                      <div key={log.id} className="relative pl-6 border-l border-border last:border-0">
                        {/* Timeline dot */}
                        <div className={`
                          absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white
                          ${log.type === 'warning' ? 'bg-red-500' :
                            log.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}
                        `} />

                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium leading-none">{log.action}</span>
                          <span className="text-xs text-muted-foreground">{log.time}</span>
                        </div>

                        {/* Separator between items, except last one */}
                        {index !== recentActivities.length - 1 && (
                          <div className="mt-6" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Clock className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <p className="text-sm text-muted-foreground">Chưa có hoạt động nào</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Statistics Section */}
      {can(HOME_PERMISSIONS.HOME_LOGS_VIEW) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Thống kê và báo cáo
                </CardTitle>
                <CardDescription>
                  Tổng quan về hoạt động và thiết bị trong nhà
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportReport}
                disabled={isLoadingStats}
              >
                <Download className="mr-2 h-4 w-4" />
                Xuất báo cáo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Tổng thiết bị</p>
                      <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-2xl font-bold">{statistics.totalDevices}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {currentHome?.roomCount || 0} phòng
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Đang hoạt động</p>
                      <Activity className="h-4 w-4 text-green-600" />
                    </div>
                    <p className="text-2xl font-bold text-green-600">{statistics.onlineDevices}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {statistics.totalDevices > 0
                        ? Math.round((statistics.onlineDevices / statistics.totalDevices) * 100)
                        : 0}% tổng thiết bị
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Đã tắt</p>
                      <Activity className="h-4 w-4 text-gray-600" />
                    </div>
                    <p className="text-2xl font-bold text-gray-600">{statistics.offlineDevices}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {statistics.totalDevices > 0
                        ? Math.round((statistics.offlineDevices / statistics.totalDevices) * 100)
                        : 0}% tổng thiết bị
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">Thành viên</p>
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{currentHome?.memberCount || 0}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Đang hoạt động
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Device Distribution by Type */}
                {Object.keys(statistics.devicesByType).length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Phân loại thiết bị
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(statistics.devicesByType).map(([type, count]) => (
                        <div key={type} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{type}</span>
                            <span className="text-lg font-bold">{count as number}</span>
                          </div>
                          <div className="mt-2 w-full bg-muted rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{
                                width: `${(count as number / statistics.totalDevices) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top Devices */}
                {statistics.topDevices.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-4">Thiết bị hoạt động gần đây</h4>
                    <div className="space-y-2">
                      {statistics.topDevices.map((device: any, index: number) => (
                        <div
                          key={device.id || index}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Zap className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{device.deviceName || device.name || 'Thiết bị'}</p>
                              <p className="text-xs text-muted-foreground">
                                {device.deviceType || device.type || 'Unknown'} • {device.roomName || 'Chưa phân loại'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              variant={
                                device.deviceStatus === DeviceStatus.ON || device.status === DeviceStatus.ON
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {device.deviceStatus || device.status || 'UNKNOWN'}
                            </Badge>
                            {device.updatedAt && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(device.updatedAt).toLocaleDateString('vi-VN')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {statistics.totalDevices === 0 && (
                  <div className="text-center py-12">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Chưa có dữ liệu thống kê</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Thêm thiết bị vào nhà để xem thống kê
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}