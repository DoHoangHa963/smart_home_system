import React, { useState, useEffect } from 'react';
import { useDeviceStore } from '@/store/deviceStore';
import DeviceCard from '@/components/devices/DeviceCard';
import AddDeviceDialog from '@/components/devices/AddDeviceDialog';
import DeviceFilter from '@/components/devices/DeviceFilter';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PlusCircle, 
  RefreshCw,
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DeviceStatus, DeviceType } from '@/types/device';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useHomeStore } from '@/store/homeStore';
import { toast } from 'sonner';

// Mock data for rooms (you can fetch from API)
const mockRooms = [
  { id: 1, name: 'Living Room' },
  { id: 2, name: 'Bedroom' },
  { id: 3, name: 'Kitchen' },
  { id: 4, name: 'Bathroom' },
  { id: 5, name: 'Office' },
];

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
    searchDevices
  } = useDeviceStore();
  
  const { currentHome } = useHomeStore();
  
  const [filters, setFilters] = useState({
    search: '',
    deviceType: 'all',
    status: 'all',
    roomId: null as number | null,
    isFavorite: null as boolean | null,
  });
  
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    if (currentHome) {
      fetchDevicesByHome(currentHome.id, currentPage, pageSize);
    } else {
      fetchAllDevices(currentPage, pageSize);
    }
  }, [currentHome, currentPage]);

  const handleRefresh = () => {
    if (currentHome) {
      fetchDevicesByHome(currentHome.id, currentPage, pageSize);
    } else {
      fetchAllDevices(currentPage, pageSize);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (window.confirm('Are you sure you want to delete this device?')) {
      try {
        await deleteDevice(parseInt(deviceId));
        toast.success('Device deleted successfully!');
      } catch (error) {
        console.error('Failed to delete device:', error);
      }
    }
  };

  const handleControlDevice = async (deviceId: string, action: 'TURN_ON' | 'TURN_OFF' | 'TOGGLE') => {
    try {
      await controlDevice(parseInt(deviceId), action);
    } catch (error) {
      console.error('Failed to control device:', error);
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
      } else {
        fetchAllDevices(currentPage, pageSize);
      }
    }
  };

  // Apply filters to devices
  const filteredDevices = devices.filter(device => {
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

  // Lấy danh sách các phòng từ devices
  const rooms = ['All', ...Array.from(new Set(devices.map(d => d.room)))];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={handleRefresh}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Devices</h1>
          <p className="text-muted-foreground mt-1">
            {currentHome ? `Devices in ${currentHome.name}` : 'All Devices'}
            {paginatedDevices && ` · ${paginatedDevices.totalElements} devices found`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <AddDeviceDialog rooms={mockRooms} homeId={currentHome?.id || 1} />
        </div>
      </div>

      {/* Device Filter Component */}
      <DeviceFilter
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleFilterReset}
        rooms={mockRooms}
      />

      {/* Apply Search Button */}
      {(filters.search || filters.deviceType !== 'all' || filters.status !== 'all' || filters.roomId) && (
        <div className="flex justify-end">
          <Button onClick={handleSearch} disabled={isLoading}>
            <Search className="mr-2 h-4 w-4" />
            Apply Filters
          </Button>
        </div>
      )}

      {/* Tabs Filter & Grid */}
      <Tabs defaultValue="All" className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList>
            {rooms.map(room => (
              <TabsTrigger key={room} value={room} className="min-w-[80px]">
                {room === 'All' ? 'All' : room}
                <Badge variant="secondary" className="ml-2">
                  {filteredDevices.filter(d => room === 'All' || d.room === room).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {rooms.map(room => (
          <TabsContent key={room} value={room} className="mt-6 space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredDevices
                    .filter(d => room === 'All' || d.room === room)
                    .map((device) => (
                      <DeviceCard
                        key={device.id}
                        device={device}
                        onControl={handleControlDevice}
                        onDelete={handleDeleteDevice}
                      />
                    ))}
                </div>
                
                {/* Empty State */}
                {filteredDevices.filter(d => room === 'All' || d.room === room).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                    {filters.search || filters.deviceType !== 'all' || filters.status !== 'all' || filters.roomId
                      ? 'No devices match your filters'
                      : 'No devices in this room'
                    }
                  </div>
                )}
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Pagination */}
      {paginatedDevices && paginatedDevices.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-muted-foreground">
            Showing {Math.min((currentPage * pageSize) + 1, paginatedDevices.totalElements)} to{' '}
            {Math.min((currentPage + 1) * pageSize, paginatedDevices.totalElements)} of{' '}
            {paginatedDevices.totalElements} devices
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0 || isLoading}
            >
              Previous
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
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}