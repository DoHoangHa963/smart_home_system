import { useState, useEffect } from 'react';
import { useHomeStore } from '@/store/homeStore';
import RoomCard from '@/components/rooms/RoomCard';
import CreateRoomModal from '@/components/rooms/CreateRoomModal';
import { Separator } from '@/components/ui/separator';
import { Loader2, DoorOpen, Grid3X3, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRoomsByHome } from '@/hooks/useRoom';

export default function Rooms() {
  const { currentHome } = useHomeStore();
  
  // 1. STATE QUẢN LÝ: Chỉ lưu ID của phòng đang mở (null = đóng hết)
  const [expandedRoomId, setExpandedRoomId] = useState<number | null>(null);

  const { 
    data: rooms = [], 
    isLoading, 
    refetch 
  } = useRoomsByHome(currentHome?.id, {
    enabled: !!currentHome?.id,
  });

  // Reset trạng thái mở khi đổi nhà hoặc load lại trang
  useEffect(() => {
    if (currentHome?.id) {
      refetch();
      setExpandedRoomId(null);
    }
  }, [currentHome?.id, refetch]);

  // 2. HÀM XỬ LÝ CLICK: Logic đóng/mở thông minh
  const handleToggleRoom = (roomId: number) => {
    setExpandedRoomId((prevId) => {
      // Nếu bấm vào phòng đang mở -> Đóng lại (về null)
      if (prevId === roomId) return null;
      // Nếu bấm vào phòng khác -> Mở phòng đó (lưu ID mới)
      return roomId;
    });
  };

  return (
    <div className="space-y-6 pb-10 px-4 md:px-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Grid3X3 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Quản lý Phòng</h1>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Danh sách các phòng trong nhà
            </p>
            <Badge variant="outline" className="w-fit">
              {currentHome?.name || 'Chưa chọn nhà'}
            </Badge>
            {rooms.length > 0 && (
              <Badge variant="secondary" className="w-fit">
                {rooms.length} phòng
              </Badge>
            )}
          </div>
        </div>
        
        <CreateRoomModal />
      </div>

      <Separator />

      {/* CONTENT */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-lg border">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Đang tải danh sách phòng...</p>
          </div>
        </div>
      ) : (
        <>
          {rooms.length > 0 ? (
            // Thêm items-start để các card không bị kéo dãn chiều cao theo card đang mở
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6 items-start">
              {rooms.map((room) => (
                <RoomCard 
                  key={room.id} 
                  room={room} 
                  // 3. TRUYỀN PROPS XUỐNG ROOMCARD
                  isExpanded={expandedRoomId === room.id} // Chỉ true nếu ID trùng khớp
                  onToggle={() => handleToggleRoom(room.id)} // Truyền hàm xử lý
                />
              ))}
            </div>
          ) : (
            // Empty State
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg bg-muted/20">
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <DoorOpen className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Chưa có phòng nào</h3>
              <p className="text-muted-foreground max-w-md mb-6">
                Hãy tạo các phòng để quản lý thiết bị dễ dàng hơn.
              </p>
              <div className="space-y-3">
                <CreateRoomModal />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refetch()}
                  className="text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Tải lại
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}