import { useState, useEffect } from 'react';
import { useHomeStore } from '@/store/homeStore';
import RoomCard from '@/components/rooms/RoomCard';
import CreateRoomModal from '@/components/rooms/CreateRoomModal';
import { Separator } from '@/components/ui/separator';
import { Loader2, DoorOpen, Grid3X3, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRoomsByHome } from '@/hooks/useRoom';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

export default function Rooms() {
  const { currentHome } = useHomeStore();
  const [expandedRoomId, setExpandedRoomId] = useState<number | null>(null);
  const { isMobile, isTablet, type } = useDeviceDetection();

  const { 
    data: rooms = [], 
    isLoading, 
    refetch 
  } = useRoomsByHome(currentHome?.id, {
    enabled: !!currentHome?.id,
  });

  useEffect(() => {
    if (currentHome?.id) {
      refetch();
      setExpandedRoomId(null);
    }
  }, [currentHome?.id, refetch]);

  const handleToggleRoom = (roomId: number) => {
    setExpandedRoomId((prevId) => prevId === roomId ? null : roomId);
  };

  // Responsive grid classes
  const getGridClasses = () => {
    if (isMobile) return 'grid-cols-1';
    if (isTablet) return 'grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
  };

  return (
    <div className={`space-y-6 pb-10 ${isMobile ? 'px-3' : 'px-4 md:px-6'}`}>
      {/* HEADER - Responsive */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Grid3X3 className={`text-primary flex-shrink-0 ${
                isMobile ? 'h-5 w-5' : 'h-6 w-6'
              }`} />
              <h1 className={`font-bold tracking-tight truncate ${
                isMobile ? 'text-xl' : 'text-2xl md:text-3xl'
              }`}>
                Quản lý Phòng
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Danh sách các phòng trong nhà
              </p>
              <Badge variant="outline" className={`w-fit ${
                isMobile ? 'text-xs' : ''
              }`}>
                {currentHome?.name || 'Chưa chọn nhà'}
              </Badge>
              {rooms.length > 0 && (
                <Badge variant="secondary" className={`w-fit ${
                  isMobile ? 'text-xs' : ''
                }`}>
                  {rooms.length} phòng
                </Badge>
              )}
            </div>
          </div>
          
          {!isMobile && <CreateRoomModal />}
        </div>

        {isMobile && (
          <div className="flex gap-2">
            <CreateRoomModal />
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* CONTENT - Responsive Grid */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center rounded-lg border">
          <div className="text-center">
            <Loader2 className={`animate-spin text-primary mx-auto mb-2 ${
              isMobile ? 'h-6 w-6' : 'h-8 w-8'
            }`} />
            <p className={`text-muted-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Đang tải danh sách phòng...
            </p>
          </div>
        </div>
      ) : (
        <>
          {rooms.length > 0 ? (
            <div className={`grid ${getGridClasses()} ${
              isMobile ? 'gap-3' : 'gap-4 md:gap-6'
            } items-start`}>
              {rooms.map((room) => (
                <RoomCard 
                  key={room.id} 
                  room={room} 
                  isExpanded={expandedRoomId === room.id}
                  onToggle={() => handleToggleRoom(room.id)}
                />
              ))}
            </div>
          ) : (
            <div className={`flex flex-col items-center justify-center text-center border-2 border-dashed rounded-lg bg-muted/20 ${
              isMobile ? 'py-12 px-4' : 'py-16'
            }`}>
              <div className={`bg-primary/10 rounded-full mb-4 ${
                isMobile ? 'p-3' : 'p-4'
              }`}>
                <DoorOpen className={`text-primary ${
                  isMobile ? 'h-8 w-8' : 'h-12 w-12'
                }`} />
              </div>
              <h3 className={`font-semibold mb-2 ${
                isMobile ? 'text-lg' : 'text-xl'
              }`}>
                Chưa có phòng nào
              </h3>
              <p className={`text-muted-foreground max-w-md mb-6 ${
                isMobile ? 'text-sm px-4' : ''
              }`}>
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