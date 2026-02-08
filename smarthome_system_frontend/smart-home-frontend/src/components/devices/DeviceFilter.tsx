import React from 'react';
import { DeviceType, DeviceStatus } from '@/types/device';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SlidersHorizontal, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface DeviceFilterProps {
  filters: {
    search: string;
    deviceType: string;
    status: string;
    roomId: number | null;
    isFavorite: boolean | null;
  };
  onFilterChange: (filters: any) => void;
  onReset: () => void;
  rooms: Array<{ id: number; name: string }>;
  availableDeviceTypes?: string[]; // Only show types that actually exist in devices
  availableDeviceStatuses?: string[]; // Only show statuses that actually exist in devices
}

const DeviceFilter: React.FC<DeviceFilterProps> = ({
  filters,
  onFilterChange,
  onReset,
  rooms,
  availableDeviceTypes = [],
  availableDeviceStatuses = [],
}) => {
  const [open, setOpen] = React.useState(false);
  
  const handleSearchChange = (value: string) => {
    onFilterChange({ ...filters, search: value });
  };

  const handleTypeChange = (value: string) => {
    onFilterChange({ ...filters, deviceType: value });
  };

  const handleStatusChange = (value: string) => {
    onFilterChange({ ...filters, status: value });
  };

  const handleRoomChange = (value: string) => {
    onFilterChange({ ...filters, roomId: value === 'all' ? null : parseInt(value) });
  };

  const handleFavoriteChange = (checked: boolean) => {
    onFilterChange({ ...filters, isFavorite: checked });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.deviceType !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.roomId) count++;
    if (filters.isFavorite !== null) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="flex flex-col gap-4">
      {/* Search Bar */}
      <div className="relative">
        <Input
          placeholder="Tìm kiếm theo tên hoặc mã thiết bị..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10"
        />
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        </div>
        {filters.search && (
          <button
            onClick={() => handleSearchChange('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filters.deviceType} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Loại thiết bị" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả loại</SelectItem>
            {availableDeviceTypes.length > 0 ? (
              availableDeviceTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))
            ) : (
              Object.values(DeviceType).map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            {availableDeviceStatuses.length > 0 ? (
              availableDeviceStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))
            ) : (
              Object.values(DeviceStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>

        <Select 
          value={filters.roomId ? filters.roomId.toString() : 'all'} 
          onValueChange={handleRoomChange}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Phòng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả phòng</SelectItem>
            {rooms.length > 0 ? (
              rooms.map((room) => (
                <SelectItem key={room.id} value={room.id.toString()}>
                  {room.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>
                Chưa có phòng
              </SelectItem>
            )}
          </SelectContent>
        </Select>

        {/* Advanced Filters Popover */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Bộ lọc nâng cao
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium leading-none">Bộ lọc</h4>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReset}
                    className="h-auto p-0 text-sm"
                  >
                    Xóa tất cả
                  </Button>
                )}
              </div>
              
              <div className="space-y-4">
                {/* Favorite Filter */}
                <div className="flex items-center justify-between">
                  <Label htmlFor="favorite">Chỉ thiết bị yêu thích</Label>
                  <Switch
                    id="favorite"
                    checked={filters.isFavorite === true}
                    onCheckedChange={handleFavoriteChange}
                  />
                </div>

                {/* Reset Button */}
                <Button
                  variant="outline"
                  onClick={onReset}
                  className="w-full"
                  disabled={activeFilterCount === 0}
                >
                  Đặt lại bộ lọc
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Reset Button (only show when filters are active) */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Tìm kiếm: {filters.search}
              <button onClick={() => handleSearchChange('')} className="ml-1 hover:bg-muted rounded">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.deviceType !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Loại: {filters.deviceType}
              <button onClick={() => handleTypeChange('all')} className="ml-1 hover:bg-muted rounded">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Trạng thái: {filters.status}
              <button onClick={() => handleStatusChange('all')} className="ml-1 hover:bg-muted rounded">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.roomId && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Phòng: {rooms.find(r => r.id === filters.roomId)?.name}
              <button onClick={() => handleRoomChange('all')} className="ml-1 hover:bg-muted rounded">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.isFavorite === true && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Yêu thích
              <button onClick={() => handleFavoriteChange(false)} className="ml-1 hover:bg-muted rounded">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default DeviceFilter;