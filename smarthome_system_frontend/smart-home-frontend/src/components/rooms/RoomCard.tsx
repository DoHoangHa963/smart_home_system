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
  DoorOpen,
  MoreVertical
} from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoomResponse } from '@/types/room';
import { deviceApi } from '@/lib/api/device.api';
import { useDeleteRoom } from '@/hooks/useRoom';
import { useDeviceStore } from '@/store/deviceStore';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import EditRoomModal from './EditRoomModal';

interface RoomCardProps {
  room: RoomResponse;
  isExpanded: boolean;
  onToggle: () => void;
}

const RoomDeviceList = ({ roomId }: { roomId: number }) => {
  const { controlDevice } = useDeviceStore();
  const { isMobile } = useDeviceDetection();

  const { data: devices = [], isLoading, refetch } = useQuery({
    queryKey: ['room-devices', roomId],
    queryFn: async () => {
      try {
        const res = await deviceApi.getDevicesByRoom(roomId);
        const rawData = res.data.data;
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
    staleTime: 1000 * 60,
  });

  const handleToggle = async (deviceId: number) => {
    try {
      await controlDevice(deviceId, 'TOGGLE');
      refetch();
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
        <div 
          key={device.id} 
          className={`flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm hover:bg-muted transition-colors ${
            isMobile ? 'active:scale-95' : ''
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Power className={`h-4 w-4 flex-shrink-0 ${
              ['ON', 'on', true].includes(device.status) ? 'text-green-500' : 'text-gray-400'
            }`} />
            <span className="font-medium truncate">{device.name}</span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="outline" className="text-[10px] h-5 px-1 hidden sm:inline-flex">
              {device.type}
            </Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              className={`h-8 w-8 ${isMobile ? 'h-10 w-10' : 'h-8 w-8'} hover:bg-white/50`}
              onClick={() => handleToggle(device.id)}
            >
              <Power className={`h-4 w-4 ${
                ['ON', 'on', true].includes(device.status) ? 'text-primary' : ''
              }`} />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function RoomCard({ room, isExpanded, onToggle }: RoomCardProps) {
  const deleteRoomMutation = useDeleteRoom();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { isMobile, isTablet } = useDeviceDetection();

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

  // Mobile: Dùng Dropdown Menu cho actions
  const MobileActions = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
          <Edit2 className="h-4 w-4 mr-2" />
          Chỉnh sửa
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setIsDeleteDialogOpen(true)}
          className="text-red-600"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Xóa phòng
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // Desktop: Hiện trực tiếp các nút
  const DesktopActions = () => (
    <div className="flex gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 text-muted-foreground hover:text-primary"
        onClick={() => setIsEditOpen(true)}
      >
        <Edit2 className="h-4 w-4" />
      </Button>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-600"
        disabled={deleteRoomMutation.isPending}
        onClick={() => setIsDeleteDialogOpen(true)}
      >
        {deleteRoomMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );

  return (
    <>
      <Card className={`group relative transition-all duration-300 overflow-hidden border hover:border-primary/50 ${
        isExpanded ? 'ring-2 ring-primary/20 shadow-md' : ''
      } ${isMobile ? 'active:scale-[0.98]' : ''}`}>
        <div className="absolute top-0 right-0 h-12 w-12 bg-gradient-to-br from-primary/10 to-transparent rounded-bl-2xl" />
        
        <CardHeader className={`${isMobile ? 'pb-2' : 'pb-3'}`}>
          <div className="flex justify-between items-start gap-2">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={`bg-primary/10 p-2 rounded-lg flex-shrink-0 ${
                isMobile ? 'p-1.5' : 'p-2'
              }`}>
                <DoorOpen className={`text-primary ${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className={`truncate ${isMobile ? 'text-base' : 'text-lg'}`}>
                  {room.name}
                </CardTitle>
                <p className={`text-muted-foreground mt-1 truncate ${
                  isMobile ? 'text-[10px]' : 'text-xs'
                }`}>
                  ID: {room.id} • Nhà: {room.homeName || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className={`${isMobile ? 'pb-2' : 'pb-3'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <PlugZap className="h-4 w-4 text-muted-foreground" />
              <span className={`font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Thiết bị
              </span>
            </div>
            <Badge variant={room.deviceCount > 0 ? "default" : "outline"}>
              {room.deviceCount || 0}
            </Badge>
          </div>
          
          {isExpanded && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <Separator className="my-2"/>
              <RoomDeviceList roomId={room.id} />
            </div>
          )}
        </CardContent>
        
        <CardFooter className={`border-t flex justify-between bg-muted/10 ${
          isMobile ? 'pt-2' : 'pt-3'
        }`}>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={onToggle} 
            className={`hover:bg-primary/10 hover:text-primary ${
              isMobile ? 'h-8 text-xs px-2' : 'h-8 text-xs'
            }`}
          >
            {isExpanded ? (
              <>
                <ChevronUp className={`mr-1 ${isMobile ? 'h-3 w-3' : 'h-3 w-3'}`} />
                {!isMobile && 'Thu gọn'}
              </>
            ) : (
              <>
                <ChevronDown className={`mr-1 ${isMobile ? 'h-3 w-3' : 'h-3 w-3'}`} />
                {!isMobile && 'Chi tiết'}
              </>
            )}
          </Button>
          
          {isMobile || isTablet ? <MobileActions /> : <DesktopActions />}
        </CardFooter>
      </Card>

      {/* Modals */}
      <EditRoomModal 
        room={room} 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
      />

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className={isMobile ? 'max-w-[90vw]' : ''}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              Xóa phòng "{room.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác.
              {room.deviceCount > 0 && (
                <span className="block mt-2 text-red-500 font-medium">
                  ⚠️ Cảnh báo: Phòng này đang chứa {room.deviceCount} thiết bị.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className={isMobile ? 'flex-col gap-2' : ''}>
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
    </>
  );
}