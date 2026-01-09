import React from 'react';
import { DeviceStatus, DeviceType } from '@/types/device';
import { useDeviceStore } from '@/store/deviceStore'; // Import store nếu muốn dùng trực tiếp
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Lightbulb, 
  Fan, 
  Power, 
  Settings, 
  PowerOff,
  Zap,
  MoreVertical,
  Thermometer
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// 1. Định nghĩa Interface chuẩn một lần duy nhất
interface DeviceCardProps {
  device: {
    id: string | number; // Chấp nhận cả number và string để linh hoạt
    name: string;
    type: DeviceType;
    status: DeviceStatus;
    room?: string;
    deviceCode?: string;
    stateValue?: string;
  };
  // Callback để Component cha (RoomDetail) xử lý logic
  onControl?: (deviceId: string | number, action: 'TURN_ON' | 'TURN_OFF' | 'TOGGLE') => void;
  onEdit?: (deviceId: string | number) => void;
  onDelete?: (deviceId: string | number) => void;
}

const DeviceCard: React.FC<DeviceCardProps> = ({ device, onControl, onEdit, onDelete }) => {
  // Nếu không truyền onControl từ cha, có thể dùng store trực tiếp (fallback)
  const { controlDevice } = useDeviceStore(); 
  
  const getDeviceIcon = () => {
    switch (device.type) {
      case DeviceType.LIGHT:
        return <Lightbulb className="h-6 w-6" />;
      case DeviceType.FAN:
        return <Fan className="h-6 w-6" />;
      case DeviceType.SENSOR:
        return <Thermometer className="h-6 w-6" />;
      default:
        return <Power className="h-6 w-6" />;
    }
  };

  const getStatusColor = () => {
    switch (device.status) {
      case DeviceStatus.ON:
        return 'bg-green-500';
      case DeviceStatus.OFF:
        return 'bg-gray-400';
      case DeviceStatus.ONLINE:
        return 'bg-blue-500';
      case DeviceStatus.OFFLINE:
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  // Hàm xử lý chung cho Toggle Switch
  const handleToggle = async () => {
    const action = device.status === DeviceStatus.ON ? 'TURN_OFF' : 'TURN_ON';
    
    if (onControl) {
      // Ưu tiên dùng prop từ cha truyền xuống
      onControl(device.id, action);
    } else {
      // Fallback: Gọi trực tiếp store nếu không có onControl
      try {
        await controlDevice(Number(device.id), action);
      } catch (error) {
        console.error('Failed to toggle device:', error);
      }
    }
  };

  // Hàm xử lý cho Dropdown Menu
  const handleMoreAction = (action: string) => {
    switch (action) {
      case 'edit':
        onEdit?.(device.id);
        break;
      case 'delete':
        onDelete?.(device.id);
        break;
      case 'turn_on':
        onControl ? onControl(device.id, 'TURN_ON') : controlDevice(Number(device.id), 'TURN_ON');
        break;
      case 'turn_off':
        onControl ? onControl(device.id, 'TURN_OFF') : controlDevice(Number(device.id), 'TURN_OFF');
        break;
      case 'toggle':
        handleToggle();
        break;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${device.status === DeviceStatus.ON ? 'bg-primary/10' : 'bg-muted'}`}>
              {getDeviceIcon()}
            </div>
            <div>
              <CardTitle className="text-lg font-semibold line-clamp-1">{device.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{device.room || 'N/A'}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleMoreAction('edit')}>
                <Settings className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMoreAction('turn_on')}>
                <Power className="mr-2 h-4 w-4" />
                Turn On
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleMoreAction('turn_off')}>
                <PowerOff className="mr-2 h-4 w-4" />
                Turn Off
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleMoreAction('delete')}
                className="text-red-600 focus:text-red-600"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="pb-4">
        <div className="flex items-center justify-between mb-3">
          <Badge 
            variant={device.status === DeviceStatus.ON ? "default" : "secondary"}
            className={`${getStatusColor()} text-white`}
          >
            {device.status}
          </Badge>
          <Badge variant="outline">
            {device.type}
          </Badge>
        </div>
        
        {device.deviceCode && (
          <p className="text-sm text-muted-foreground truncate">
            Code: {device.deviceCode}
          </p>
        )}
      </CardContent>
      
      <CardFooter className="pt-2 border-t">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-2">
            <Switch
              checked={device.status === DeviceStatus.ON}
              onCheckedChange={handleToggle}
              disabled={device.status === DeviceStatus.OFFLINE}
            />
            <span className="text-sm">
              {device.status === DeviceStatus.ON ? 'On' : 'Off'}
            </span>
          </div>
          
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleToggle()}
            disabled={device.status === DeviceStatus.OFFLINE}
          >
            <Zap className="h-4 w-4 mr-1" />
            Toggle
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default DeviceCard;