// src/pages/room/RoomDetail.tsx
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoom } from '@/hooks/useRoom';
import { useDeviceStore } from '@/store/deviceStore'; // Import Store của bạn
import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Plus, Plug, RotateCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import DeviceCard from '@/components/devices/DeviceCard'; // Component hiển thị thiết bị
import EditRoomModal from '@/components/rooms/EditRoomModal';
import { useState } from 'react';
import AddDeviceDialog from '@/components/devices/AddDeviceDialog';

export default function RoomDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const roomId = Number(id);

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

  // 3. Gọi action fetchDevicesByRoom khi component mount hoặc roomId thay đổi
  useEffect(() => {
    if (roomId) {
      fetchDevicesByRoom(roomId);
    }
  }, [roomId, fetchDevicesByRoom]);

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
            <Button variant="outline" className="gap-2" onClick={() => setIsEditOpen(true)}>
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

      {/* DEVICE LIST SECTION */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Danh sách thiết bị</h2>
          <Button size="sm" className="gap-2">
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
                onControl={(id) => controlDevice(Number(id), 'TOGGLE')}
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