import { useState } from 'react';
import { useDeviceStore } from '@/store/deviceStore';
import DeviceCard from '@/components/devices/DeviceCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, SlidersHorizontal } from 'lucide-react';

export default function Devices() {
  const { devices, toggleDevice } = useDeviceStore();
  
  // Lấy danh sách các phòng (Unique)
  const rooms = ['All', ...Array.from(new Set(devices.map(d => d.room)))];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Thiết bị</h1>
          <p className="text-muted-foreground mt-1">Quản lý và điều khiển ngôi nhà của bạn.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="hidden sm:flex">
            <SlidersHorizontal className="mr-2 h-4 w-4" /> Filter
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" /> Thêm thiết bị
          </Button>
        </div>
      </div>

      {/* Tabs Filter & Grid */}
      <Tabs defaultValue="All" className="w-full">
        <div className="overflow-x-auto pb-2"> {/* Cho phép scroll ngang trên mobile */}
          <TabsList>
            {rooms.map(room => (
              <TabsTrigger key={room} value={room} className="min-w-[80px]">
                {room === 'All' ? 'Tất cả' : room}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {rooms.map(room => (
          <TabsContent key={room} value={room} className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {devices
                .filter(d => room === 'All' || d.room === room)
                .map((device) => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    onToggle={toggleDevice}
                  />
                ))}
            </div>
            
            {/* Empty State nếu không có thiết bị */}
            {devices.filter(d => room === 'All' || d.room === room).length === 0 && (
              <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                Không có thiết bị nào trong phòng này
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}