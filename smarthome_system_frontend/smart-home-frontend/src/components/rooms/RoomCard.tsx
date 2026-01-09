import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Loader2, 
  Power, 
  PlugZap, 
  ChevronDown, 
  ChevronUp, 
  Edit2, 
  Trash2, 
  DoorOpen 
} from 'lucide-react';

// Components UI
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Types & APIs
import { RoomResponse } from '@/types/room';
import { deviceApi } from '@/lib/api/device.api'; // Import API Device
import { useDeleteRoom } from '@/hooks/useRoom';
import { useDeviceStore } from '@/store/deviceStore'; // Import Store để lấy hàm control

// Components con
import EditRoomModal from './EditRoomModal';

// --- INTERFACE ---
interface RoomCardProps {
  room: RoomResponse;
  isExpanded: boolean;      // Trạng thái mở (từ cha truyền xuống)
  onToggle: () => void;     // Hàm xử lý khi bấm nút Chi tiết (từ cha)
}

// --- COMPONENT CON: DANH SÁCH THIẾT BỊ ---
const RoomDeviceList = ({ roomId }: { roomId: number }) => {
  const { controlDevice } = useDeviceStore();

  // Fetch dữ liệu thiết bị (Chỉ chạy khi component này được render)
  const { data: devices = [], isLoading, refetch } = useQuery({
    queryKey: ['room-devices', roomId],
    queryFn: async () => {
      try {
        // Gọi API chuẩn: /devices/room/{id}
        const res = await deviceApi.getDevicesByRoom(roomId);
        const rawData = res.data.data;

        // Xử lý dữ liệu trả về (Content phân trang hoặc Mảng)
        if (rawData && typeof rawData === 'object' && 'content' in rawData) {
            return rawData.content;
        }
        if (Array.isArray(rawData)) {
            return rawData;
        }
        return [];
      } catch (error) {
        console.error(`Lỗi tải thiết bị phòng ${roomId}:`, error);
        return [];
      }
    },
    staleTime: 1000 * 60, // Cache 1 phút
  });

  // Xử lý bật tắt nhanh
  const handleToggle = async (deviceId: number) => {
    try {
        await controlDevice(deviceId, 'TOGGLE');
        refetch(); // Tải lại danh sách để cập nhật trạng thái UI
    } catch (e) { 
        console.error(e); 
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!devices || devices.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center p-4 text-muted-foreground">
            <PlugZap className="h-6 w-6 mb-1 opacity-50" />
            <p className="text-xs">Chưa có thiết bị nào</p>
        </div>
    );
  }

  return (
    <div className="space-y-2 mt-2">
      {devices.map((device: any) => (
        <div key={device.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm hover:bg-muted transition-colors">
          <div className="flex items-center gap-2">
            {/* Icon đổi màu theo trạng thái */}
            <Power className={`h-4 w-4 ${['ON', 'on', true].includes(device.status) ? 'text-green-500' : 'text-gray-400'}`} />
            <span className="font-medium line-clamp-1">{device.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] h-5 px-1">{device.type}</Badge>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 hover:bg-white/50"
                onClick={() => handleToggle(device.id)}
            >
                <Power className={`h-3 w-3 ${['ON', 'on', true].includes(device.status) ? 'text-primary' : ''}`} />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

// --- COMPONENT CHÍNH: ROOM CARD ---
export default function RoomCard({ room, isExpanded, onToggle }: RoomCardProps) {
  const deleteRoomMutation = useDeleteRoom();
  
  // State quản lý Modal Edit (vẫn nằm cục bộ vì nó không ảnh hưởng layout grid)
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteRoomMutation.mutateAsync({
        roomId: room.id,
        homeId: room.homeId
      });
    } catch (error) {
      console.error('Failed to delete room:', error);
    }
  };

  return (
    <>
      <Card className={`group relative transition-all duration-300 overflow-hidden border hover:border-primary/50 ${isExpanded ? 'ring-2 ring-primary/20 shadow-md' : ''}`}>
        {/* Trang trí góc thẻ */}
        <div className="absolute top-0 right-0 h-12 w-12 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-2xl" />
        
        <CardHeader className="pb-3">
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <DoorOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg line-clamp-1">
                  {room.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  ID: {room.id} • Nhà: {room.homeName || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pb-3">
          {/* Badge đếm thiết bị */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PlugZap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Thiết bị</span>
            </div>
            <Badge variant={room.deviceCount > 0 ? "default" : "outline"}>
              {room.deviceCount || 0}
            </Badge>
          </div>
          
          {/* PHẦN MỞ RỘNG (Render có điều kiện dựa trên props từ cha) */}
          {isExpanded && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <Separator className="my-2"/>
                <RoomDeviceList roomId={room.id} />
            </div>
          )}
        </CardContent>
        
        <CardFooter className="pt-3 border-t flex justify-between bg-muted/10">
          {/* Nút Chi tiết / Thu gọn */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onToggle} 
            className="h-8 text-xs hover:bg-primary/10 hover:text-primary"
          >
            {isExpanded ? (
                <>
                    <ChevronUp className="h-3 w-3 mr-1" /> Thu gọn
                </>
            ) : (
                <>
                    <ChevronDown className="h-3 w-3 mr-1" /> Chi tiết
                </>
            )}
          </Button>
          
          {/* Nhóm nút thao tác: Sửa / Xóa */}
          <div className="flex gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-primary"
              onClick={() => setIsEditOpen(true)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
                  disabled={deleteRoomMutation.isPending}
                >
                  {deleteRoomMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-red-600">Xóa phòng "{room.name}"?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Hành động này không thể hoàn tác.
                    {room.deviceCount > 0 && (
                      <span className="block mt-2 text-red-500 font-medium">
                        ⚠️ Cảnh báo: Phòng này đang chứa {room.deviceCount} thiết bị.
                      </span>
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete} 
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Xác nhận xóa
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardFooter>
      </Card>

      {/* Modal Edit nằm ngoài Card */}
      <EditRoomModal 
        room={room} 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
      />
    </>
  );
}