import React, { useState, useEffect, useMemo } from 'react';
import { useDeviceStore } from '@/store/deviceStore';
import DeviceCard from '@/components/devices/DeviceCard';
import AddDeviceDialog from '@/components/devices/AddDeviceDialog';
import EditDeviceDialog from '@/components/devices/EditDeviceDialog';
import DeviceFilter from '@/components/devices/DeviceFilter';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PlusCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  Lock,
  Eye,
  WifiOff
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useHomeStore } from '@/store/homeStore';
import { usePermission } from '@/hooks/usePermission';
import { HOME_PERMISSIONS } from '@/types/permission';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import roomApi from '@/lib/api/room.api';
import { mcuApi, MCUOnlineStatus } from '@/lib/api/mcu.api';
import { DeviceType, DeviceStatus, DeviceResponse } from '@/types/device';
import type { RoomResponse } from '@/types/room';
import { webSocketService } from '@/lib/websocket';

export default function Devices() {
  const {
    devices,
    paginatedDevices,
    isLoading,
    error,
    fetchAllDevices,
    fetchDevicesByHome,
    deleteDevice,
    controlDevice,
    searchDevices,
    updateDeviceFromWebSocket
  } = useDeviceStore();

  const { currentHome } = useHomeStore();
  const { can, hasHomeAccess, isAdmin, isOwner, homeRole } = usePermission();

  const [filters, setFilters] = useState({
    search: '',
    deviceType: 'all',
    status: 'all',
    roomId: null as number | null,
    isFavorite: null as boolean | null,
  });

  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;
  const [rooms, setRooms] = useState<RoomResponse[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  // Edit device dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<DeviceResponse | null>(null);

  // MCU status state
  const [mcuStatus, setMcuStatus] = useState<MCUOnlineStatus | null>(null);

  // Kiểm tra quyền - OWNER và ADMIN luôn có đầy đủ quyền
  const canViewDevices = isAdmin || isOwner || can(HOME_PERMISSIONS.DEVICE_VIEW);
  const canAddDevices = isAdmin || isOwner || can(HOME_PERMISSIONS.DEVICE_CREATE);
  const canControlDevices = isAdmin || isOwner || can(HOME_PERMISSIONS.DEVICE_CONTROL);
  const canDeleteDevices = isAdmin || isOwner || can(HOME_PERMISSIONS.DEVICE_DELETE);
  const canEditDevices = isAdmin || isOwner || can(HOME_PERMISSIONS.DEVICE_UPDATE);
  const canSearchDevices = isAdmin || isOwner || can(HOME_PERMISSIONS.DEVICE_VIEW); // Có quyền xem mới được search

  // Load rooms from API
  useEffect(() => {
    const loadRooms = async () => {
      if (!currentHome) return;

      setIsLoadingRooms(true);
      try {
        const roomsData = await roomApi.getRoomsByHomeId(currentHome.id);
        // Ensure roomsData is always an array
        let roomsArray: RoomResponse[] = [];
        if (Array.isArray(roomsData)) {
          roomsArray = roomsData;
        } else if (roomsData && typeof roomsData === 'object' && 'content' in roomsData) {
          // Handle PaginatedRooms format
          roomsArray = (roomsData as any).content || [];
        }
        setRooms(roomsArray);
      } catch (error) {
        console.error('Failed to load rooms:', error);
        setRooms([]);
      } finally {
        setIsLoadingRooms(false);
      }
    };

    if (currentHome) {
      loadRooms();
    }
  }, [currentHome]);

  useEffect(() => {
    if (canViewDevices && currentHome) {
      fetchDevicesByHome(currentHome.id, currentPage, pageSize);
    }
  }, [currentHome, currentPage, canViewDevices]);

  // Polling device status để sync với backend (MCU có thể cập nhật device status qua heartbeat)
  useEffect(() => {
    if (!canViewDevices || !currentHome) return;

    // Polling device status mỗi 30 giây (tương ứng với MCU heartbeat frequency)
    // Để sync trạng thái device khi MCU tắt/bật device
    const deviceSyncInterval = setInterval(() => {
      if (currentHome) {
        fetchDevicesByHome(currentHome.id, currentPage, pageSize);
      }
    }, 30000); // 30 seconds - sync với MCU heartbeat frequency

    return () => clearInterval(deviceSyncInterval);
  }, [canViewDevices, currentHome, currentPage, pageSize, fetchDevicesByHome]);

  // Check MCU status when home changes
  useEffect(() => {
    const checkMCU = async () => {
      if (currentHome) {
        try {
          const status = await mcuApi.checkMCUOnlineStatus(currentHome.id);
          setMcuStatus(status);
        } catch (error) {
          console.error('Failed to check MCU status:', error);
          setMcuStatus({
            hasMCU: false,
            isOnline: false,
            status: null,
            message: 'Không thể kiểm tra trạng thái MCU'
          });
        }
      }
    };

    checkMCU();
    // Refresh MCU status periodically (every 15 seconds) - shorter interval for faster detection
    const interval = setInterval(checkMCU, 15000);
    return () => clearInterval(interval);
  }, [currentHome?.id]);

  // WebSocket subscription for device status updates
  useEffect(() => {
    if (!currentHome || !canViewDevices) return;

    // Subscribe to device-status topic for real-time device status updates
    const deviceStatusTopic = `/topic/home/${currentHome.id}/device-status`;
    
    // Connect and subscribe
    webSocketService.activate();
    
    const subId = webSocketService.subscribe(deviceStatusTopic, (message) => {
      console.log('[WebSocket] Received device status update (raw):', message);
      console.log('[WebSocket] Message type:', typeof message);
      
      try {
        // WebSocket service đã parse JSON, nhưng cần handle cả string và object
        let parsedMessage = message;
        
        // Nếu message là string, parse JSON
        if (typeof message === 'string') {
          try {
            parsedMessage = JSON.parse(message);
            console.log('[WebSocket] Parsed JSON string:', parsedMessage);
          } catch (e) {
            console.warn('[WebSocket] Failed to parse message as JSON:', e);
            return;
          }
        }
        
        // Kiểm tra xem parsedMessage có phải object không
        if (typeof parsedMessage === 'object' && parsedMessage !== null) {
          const updateData = {
            gpioPin: parsedMessage.gpioPin,
            deviceCode: parsedMessage.deviceCode,
            status: parsedMessage.status,
            stateValue: parsedMessage.stateValue,
          };
          
          console.log('[WebSocket] Extracted update data:', updateData);
          console.log('[WebSocket] Calling updateDeviceFromWebSocket...');
          
          updateDeviceFromWebSocket(updateData);
          
          console.log('[WebSocket] updateDeviceFromWebSocket called successfully');
        } else {
          console.warn('[WebSocket] Parsed message is not an object:', parsedMessage);
        }
      } catch (e) {
        console.error('[WebSocket] Error processing device status update:', e);
      }
    });
    
    console.log('[Devices] Subscribed to device-status topic:', deviceStatusTopic);

    return () => {
      webSocketService.unsubscribe(subId);
    };
  }, [currentHome?.id, canViewDevices, updateDeviceFromWebSocket]);

  // Extract unique values from actual devices data
  const availableDeviceTypes = useMemo(() => {
    const types = new Set<string>();
    devices.forEach(device => {
      if (device.type) {
        types.add(device.type);
      }
    });
    return Array.from(types).sort();
  }, [devices]);

  const availableDeviceStatuses = useMemo(() => {
    const statuses = new Set<string>();
    devices.forEach(device => {
      if (device.status) {
        statuses.add(device.status);
      }
    });
    return Array.from(statuses).sort();
  }, [devices]);

  // Map rooms to filter format
  const roomsForFilter = useMemo(() => {
    if (!Array.isArray(rooms)) {
      return [];
    }
    return rooms.map(room => ({
      id: room.id,
      name: room.name,
    }));
  }, [rooms]);

  // Hiển thị thông báo nếu không có quyền truy cập Home
  if (!hasHomeAccess && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Alert className="max-w-md">
          <AlertDescription>Vui lòng chọn nhà trước</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Hiển thị thông báo nếu không có quyền xem thiết bị
  if (!canViewDevices) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>Bạn không có quyền xem danh sách thiết bị</AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleRefresh = () => {
    if (currentHome) {
      fetchDevicesByHome(currentHome.id, currentPage, pageSize);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa thiết bị này?')) {
      try {
        await deleteDevice(parseInt(deviceId));
        // Refresh danh sách device sau khi xóa thành công
        // Toast đã được hiển thị trong deleteDevice của store, không cần hiển thị lại
        if (currentHome) {
          await fetchDevicesByHome(currentHome.id, currentPage, pageSize);
        }
      } catch (error: any) {
        console.error('Failed to delete device:', error);
        // Toast error đã được hiển thị trong deleteDevice của store, không cần hiển thị lại
        // Chỉ refresh nếu có lỗi không phải do null data
        const errorMsg = error?.response?.data?.message || error?.message;
        if (!errorMsg || !errorMsg.includes('null')) {
          // Nếu có lỗi thực sự, refresh để cập nhật UI
          if (currentHome) {
            await fetchDevicesByHome(currentHome.id, currentPage, pageSize);
          }
        }
      }
    }
  };

  const handleControlDevice = async (deviceId: string, action: 'TURN_ON' | 'TURN_OFF' | 'TOGGLE') => {
    try {
      await controlDevice(parseInt(deviceId), action, currentHome?.id);
      // Refresh devices list after control to sync with database
      // Toast đã được hiển thị trong controlDevice của store, không cần hiển thị lại
      if (currentHome) {
        await fetchDevicesByHome(currentHome.id, currentPage, pageSize);
      }
    } catch (error) {
      console.error('Failed to control device:', error);
      // Toast error đã được hiển thị trong controlDevice của store, không cần hiển thị lại
    }
  };

  const handleEditDevice = (deviceId: string | number) => {
    const device = devices.find(d => d.id === deviceId.toString());
    if (device) {
      // Convert device store format to DeviceResponse format
      const deviceResponse: DeviceResponse = {
        id: Number(device.id),
        name: device.name,
        deviceCode: device.deviceCode || '',
        deviceType: device.type as DeviceType,
        deviceStatus: device.status as DeviceStatus,
        stateValue: device.stateValue,
        metadata: device.metadata,
        roomId: device.roomId || 0,
        roomName: device.room,
        gpioPin: device.gpioPin,
        createdAt: device.createdAt || '',
        updatedAt: device.updatedAt || '',
      };
      setSelectedDevice(deviceResponse);
      setEditDialogOpen(true);
    }
  };

  const handleEditSuccess = () => {
    if (currentHome) {
      fetchDevicesByHome(currentHome.id, currentPage, pageSize);
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  const handleFilterReset = () => {
    setFilters({
      search: '',
      deviceType: 'all',
      status: 'all',
      roomId: null,
      isFavorite: null,
    });
  };

  const handleSearch = async () => {
    if (filters.search || filters.deviceType !== 'all' || filters.status !== 'all' || filters.roomId) {
      const params = {
        query: filters.search || undefined,
        deviceType: filters.deviceType !== 'all' ? filters.deviceType : undefined,
        status: filters.status !== 'all' ? filters.status : undefined,
        roomId: filters.roomId || undefined,
      };

      await searchDevices(params);
    } else {
      // Reset to normal fetch
      if (currentHome) {
        fetchDevicesByHome(currentHome.id, currentPage, pageSize);
      }
    }
  };

  // Apply filters to devices
  // Re-calculate filteredDevices when devices change (including WebSocket updates)
  const filteredDevices = useMemo(() => {
    console.log('[Devices] Recalculating filteredDevices, devices count:', devices.length);
    const result = devices.filter(device => {
      const matchesSearch =
        filters.search === '' ||
        device.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        (device.deviceCode && device.deviceCode.toLowerCase().includes(filters.search.toLowerCase()));

      const matchesType =
        filters.deviceType === 'all' ||
        device.type === filters.deviceType;

      const matchesStatus =
        filters.status === 'all' ||
        device.status === filters.status;

      const matchesRoom =
        !filters.roomId ||
        device.roomId === filters.roomId;

      const matchesFavorite =
        filters.isFavorite === null ||
        device.isFavorite === filters.isFavorite;

      return matchesSearch && matchesType && matchesStatus && matchesRoom && matchesFavorite;
    });

    console.log('[Devices] Filtered devices:', {
      total: devices.length,
      filtered: result.length,
      first10: result.slice(0, 10).map(d => ({ id: d.id, name: d.name, type: d.type })),
      device39: devices.find(d => d.id === '39')
    });

    return result;
  }, [devices, filters]);


  // Lấy danh sách các phòng từ devices (cho tabs)
  const roomTabs = useMemo(() => {
    const uniqueRooms = new Set<string>();
    let hasDevicesWithoutRoom = false;

    devices.forEach(d => {
      if (d.room) {
        uniqueRooms.add(d.room);
      } else {
        hasDevicesWithoutRoom = true;
      }
    });

    const tabs = ['All', ...Array.from(uniqueRooms).sort()];

    // Thêm tab "Không có phòng" nếu có thiết bị không thuộc phòng nào
    if (hasDevicesWithoutRoom) {
      tabs.push('Không có phòng');
    }

    return tabs;
  }, [devices]);


  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={handleRefresh}>Thử lại</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Thiết bị</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">
              {currentHome ? `Thiết bị trong ${currentHome.name}` : 'Tất cả thiết bị'}
              {paginatedDevices && ` · ${paginatedDevices.totalElements} thiết bị`}
            </p>
            {homeRole && (
              <Badge variant="outline" className="text-xs">
                {homeRole}
              </Badge>
            )}
            {!canControlDevices && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                <Eye className="h-3 w-3 mr-1" />
                Chế độ xem
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          {canAddDevices && (
            <AddDeviceDialog rooms={roomsForFilter} homeId={currentHome?.id || 1} />
          )}
        </div>
      </div>

      {/* Device Filter Component - CHỈ HIỆN NẾU CÓ QUYỀN SEARCH */}
      {canSearchDevices && (
        <>
          <DeviceFilter
            filters={filters}
            onFilterChange={handleFilterChange}
            onReset={handleFilterReset}
            rooms={roomsForFilter}
            availableDeviceTypes={availableDeviceTypes}
            availableDeviceStatuses={availableDeviceStatuses}
          />

          {/* Apply Search Button */}
          {(filters.search || filters.deviceType !== 'all' || filters.status !== 'all' || filters.roomId) && (
            <div className="flex justify-end">
              <Button onClick={handleSearch} disabled={isLoading}>
                <Search className="mr-2 h-4 w-4" />
                Áp dụng bộ lọc
              </Button>
            </div>
          )}
        </>
      )}

      {/* Thông báo MCU offline */}
      {mcuStatus && !mcuStatus.isOnline && mcuStatus.hasMCU && (
        <Alert className="bg-orange-50 border-orange-200">
          <AlertDescription className="text-orange-800 flex items-center">
            <WifiOff className="h-4 w-4 mr-2 flex-shrink-0" />
            <span><strong>MCU Gateway đang offline.</strong> {mcuStatus.message}</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Thông báo chưa có MCU */}
      {mcuStatus && !mcuStatus.hasMCU && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertDescription className="text-yellow-800 flex items-center">
            <WifiOff className="h-4 w-4 mr-2 flex-shrink-0" />
            <span><strong>Chưa kết nối MCU Gateway.</strong> Vui lòng ghép nối thiết bị ESP32 để điều khiển thiết bị.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Thông báo chế độ xem - CHỈ HIỆN NẾU KHÔNG CÓ QUYỀN ĐIỀU KHIỂN */}
      {!canControlDevices && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertDescription className="text-blue-800 flex items-center">
            <Eye className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>Bạn đang ở chế độ xem. Bạn có thể xem thông tin thiết bị nhưng không thể điều khiển hoặc quản lý.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs Filter & Grid */}
      <Tabs defaultValue="All" className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList>
            {roomTabs.map(room => (
              <TabsTrigger key={room} value={room} className="min-w-[80px]">
                {room === 'All' ? 'Tất cả' : room}
                <Badge variant="secondary" className="ml-2">
                  {filteredDevices.filter(d => {
                    if (room === 'All') return true;
                    if (room === 'Không có phòng') return !d.room;
                    return d.room === room;
                  }).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {roomTabs.map(room => (
          <TabsContent key={room} value={room} className="mt-6 space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredDevices
                    .filter(d => {
                      if (room === 'All') return true;
                      if (room === 'Không có phòng') return !d.room;
                      return d.room === room;
                    })
                    .map((device) => (
                      <DeviceCard
                        key={device.id}
                        device={device}
                        onControl={canControlDevices ? handleControlDevice : undefined}
                        onEdit={canEditDevices ? handleEditDevice : undefined}
                        onDelete={canDeleteDevices ? handleDeleteDevice : undefined}
                        canControl={canControlDevices}
                        canDelete={canDeleteDevices}
                        canEdit={canEditDevices}
                        showActions={canControlDevices || canDeleteDevices || canEditDevices}
                        mcuOnline={mcuStatus?.isOnline ?? true}
                      />
                    ))}
                </div>

                {/* Empty State */}
                {filteredDevices.filter(d => {
                  if (room === 'All') return true;
                  if (room === 'Không có phòng') return !d.room;
                  return d.room === room;
                }).length === 0 && (
                    <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                      {filters.search || filters.deviceType !== 'all' || filters.status !== 'all' || filters.roomId
                        ? 'Không tìm thấy thiết bị phù hợp'
                        : room === 'Không có phòng'
                          ? 'Không có thiết bị nào chưa được gán phòng'
                          : 'Không có thiết bị trong phòng này'
                      }
                    </div>
                  )}
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Pagination - CHỈ HIỆN NẾU CÓ QUYỀN XEM */}
      {canViewDevices && paginatedDevices && paginatedDevices.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            Hiển thị {Math.min((currentPage * pageSize) + 1, paginatedDevices.totalElements)} đến{' '}
            {Math.min((currentPage + 1) * pageSize, paginatedDevices.totalElements)} trong{' '}
            {paginatedDevices.totalElements} thiết bị
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0 || isLoading}
            >
              Trước
            </Button>
            {Array.from({ length: Math.min(5, paginatedDevices.totalPages) }, (_, i) => {
              let pageNum;
              if (paginatedDevices.totalPages <= 5) {
                pageNum = i;
              } else if (currentPage < 3) {
                pageNum = i;
              } else if (currentPage > paginatedDevices.totalPages - 4) {
                pageNum = paginatedDevices.totalPages - 5 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                  disabled={isLoading}
                >
                  {pageNum + 1}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(paginatedDevices.totalPages - 1, prev + 1))}
              disabled={currentPage === paginatedDevices.totalPages - 1 || isLoading}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* Edit Device Dialog */}
      <EditDeviceDialog
        device={selectedDevice}
        homeId={currentHome?.id || 0}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}