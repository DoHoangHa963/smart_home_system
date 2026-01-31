// src/pages/room/RoomDetail.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoom } from '@/hooks/useRoom';
import { useDeviceStore } from '@/store/deviceStore'; // Import Store của bạn
import { useHomeStore } from '@/store/homeStore';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Plus, Plug, RotateCw, WifiOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import DeviceCard from '@/components/devices/DeviceCard'; // Component hiển thị thiết bị
import EditRoomModal from '@/components/rooms/EditRoomModal';
import AddDeviceDialog from '@/components/devices/AddDeviceDialog';
import { usePermission } from '@/hooks/usePermission';
import { HOME_PERMISSIONS } from '@/types/permission';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { mcuApi, MCUOnlineStatus } from '@/lib/api/mcu.api';

export default function RoomDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const roomId = Number(id);
  const { can, isAdmin, hasHomeAccess } = usePermission();
  const { currentHome } = useHomeStore();
  const canViewRoom = isAdmin || can(HOME_PERMISSIONS.ROOM_VIEW);
  const canEditRoom = isAdmin || can(HOME_PERMISSIONS.ROOM_UPDATE);
  const canDeleteRoom = isAdmin || can(HOME_PERMISSIONS.ROOM_DELETE);
  const canCreateDevice = isAdmin || can(HOME_PERMISSIONS.DEVICE_CREATE);
  const canControlDevice = isAdmin || can(HOME_PERMISSIONS.DEVICE_CONTROL);

  // 1. Hook lấy thông tin phòng (React Query - giữ nguyên)
  const { data: room, isLoading: isLoadingRoom } = useRoom(roomId);
  
  // 2. Store lấy danh sách thiết bị (Zustand - SỬA ĐỔI)
  const { 
    devices, 
    fetchDevicesByRoom, 
    isLoading: isLoadingDevices,
    controlDevice // Hàm điều khiển bật/tắt
  } = useDeviceStore();
  
  // State cho modal edit room
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  // MCU status state
  const [mcuStatus, setMcuStatus] = useState<MCUOnlineStatus | null>(null);

  // 3. Gọi action fetchDevicesByRoom khi component mount hoặc roomId thay đổi
  useEffect(() => {
    if (roomId) {
      fetchDevicesByRoom(roomId);
    }
  }, [roomId, fetchDevicesByRoom]);
  
  // Polling device status để sync với backend (MCU có thể cập nhật device status qua heartbeat)
  useEffect(() => {
    if (!roomId) return;
    
    // Polling device status mỗi 30 giây (tương ứng với MCU heartbeat frequency)
    // Để sync trạng thái device khi MCU tắt/bật device
    const deviceSyncInterval = setInterval(() => {
      if (roomId) {
        fetchDevicesByRoom(roomId);
      }
    }, 30000); // 30 seconds - sync với MCU heartbeat frequency
    
    return () => clearInterval(deviceSyncInterval);
  }, [roomId, fetchDevicesByRoom]);
  
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

  if (!hasHomeAccess && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Alert className="max-w-md">
          <AlertDescription>Vui lòng chọn nhà trước</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!canViewRoom) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>Bạn không có quyền xem phòng này</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Xử lý loading giao diện phòng
  if (isLoadingRoom) return <RoomDetailSkeleton />;
  if (!room) return <div className="p-8 text-center">Không tìm thấy phòng</div>;

  return (
    <div className="space-y-6 pb-10 px-4 md:px-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {room.name}
              <Badge variant="outline" className="text-sm font-normal">
                ID: {room.id}
              </Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Thuộc nhà: {room.homeName}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchDevicesByRoom(roomId)}>
                <RotateCw className={`h-4 w-4 ${isLoadingDevices ? 'animate-spin' : ''}`} />
            </Button>
            <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  if (!canEditRoom) {
                    toast.error('Bạn không có quyền chỉnh sửa phòng');
                    return;
                  }
                  setIsEditOpen(true);
                }}
                disabled={!canEditRoom}
            >
                <Edit className="h-4 w-4" /> Chỉnh sửa
            </Button>
        </div>
      </div>

      {/* STATS SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
              <Plug className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tổng thiết bị</p>
              <h3 className="text-2xl font-bold">{devices.length}</h3>
            </div>
          </CardContent>
        </Card>
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
            <WifiOff className="h-4 w-4 mr-2 flex-shrink-0" />
            <span><strong>Chưa kết nối MCU Gateway.</strong> Vui lòng ghép nối thiết bị ESP32 để điều khiển thiết bị.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* DEVICE LIST SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Danh sách thiết bị</h2>
          <Button
            size="sm"
            className="gap-2"
            disabled={!canCreateDevice}
            onClick={() => {
              if (!canCreateDevice) {
                toast.error('Bạn không có quyền thêm thiết bị');
                return;
              }
              // Fallback: open a global add-device flow if you have one; currently none here.
            }}
          >
            <Plus className="h-4 w-4" /> Thêm thiết bị
          </Button>
        </div>

        {isLoadingDevices ? (
          // Loading Skeleton cho devices
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[140px] w-full rounded-xl" />)}
          </div>
        ) : devices.length > 0 ? (
          // Render Device Cards
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {devices.map((device) => (
              <DeviceCard 
                key={device.id} 
                device={device} 
                onControl={canControlDevice ? (id) => controlDevice(Number(id), 'TOGGLE', currentHome?.id) : undefined}
                canControl={canControlDevice}
                canDelete={false}
                canEdit={false}
                showActions={canControlDevice}
                mcuOnline={mcuStatus?.isOnline ?? true}
              />
            ))}
          </div>
        ) : (
          // Empty State
          <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
            <Plug className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Chưa có thiết bị nào trong phòng này</p>
          </div>
        )}
      </div>

      {/* Modal Edit Room */}
      <EditRoomModal 
        room={room} 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
      />
    </div>
  );
}

function RoomDetailSkeleton() {
  return (
    <div className="space-y-6 px-6 pt-6">
      <div className="h-10 w-1/3 bg-muted animate-pulse rounded" />
      <div className="h-32 w-full bg-muted animate-pulse rounded" />
    </div>
  );
}