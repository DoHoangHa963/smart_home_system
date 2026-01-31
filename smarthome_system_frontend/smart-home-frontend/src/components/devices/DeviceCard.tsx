import React from 'react';
import { DeviceStatus, DeviceType } from '@/types/device';
import { useDeviceStore } from '@/store/deviceStore'; // Import store nếu muốn dùng trực tiếp
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Lightbulb,
  Fan,
  Power,
  Settings,
  PowerOff,
  DoorOpen,
  Zap,
  MoreVertical,
  Thermometer,
  Cpu,
  WifiOff,
  Ban
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
    gpioPin?: number | null; // GPIO Pin từ ESP32
  };
  // Callback để Component cha (RoomDetail) xử lý logic
  onControl?: (deviceId: string | number, action: 'TURN_ON' | 'TURN_OFF' | 'TOGGLE') => void;
  onEdit?: (deviceId: string | number) => void;
  onDelete?: (deviceId: string | number) => void;

  /**
   * Permission flags (FE should compute these and pass down)
   * - If false, we hide/disable the action and show a notification if user attempts it.
   */
  canControl?: boolean;
  canDelete?: boolean;
  canEdit?: boolean;
  showActions?: boolean;

  /**
   * MCU connection status
   * - If false, device controls are disabled because MCU is not connected/online
   */
  mcuOnline?: boolean;
}

const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  onControl,
  onEdit,
  onDelete,
  canControl = true,
  canDelete = true,
  canEdit = true,
  showActions = true,
  mcuOnline = true,
}) => {
  // Nếu không truyền onControl từ cha, có thể dùng store trực tiếp (fallback)
  const { controlDevice } = useDeviceStore();
  
  // Debug: Log khi device prop thay đổi
  React.useEffect(() => {
    console.log('[DeviceCard] Device prop updated:', {
      id: device.id,
      name: device.name,
      status: device.status,
      deviceCode: device.deviceCode,
      gpioPin: device.gpioPin
    });
  }, [device.id, device.status, device.stateValue]);

  // Kiểm tra xem thiết bị có offline không
  const isDeviceOffline = device.status === DeviceStatus.OFFLINE;

  // Kiểm tra xem có thể điều khiển thiết bị không (cần có quyền VÀ MCU phải online VÀ thiết bị không offline)
  const canActuallyControl = canControl && mcuOnline && !isDeviceOffline;

  // Lý do không thể điều khiển
  const disableReason = !mcuOnline
    ? 'mcu_offline'
    : isDeviceOffline
      ? 'device_offline'
      : null;

  const notifyDenied = (actionLabel: string) => {
    toast.error(`Bạn không có quyền ${actionLabel}.`);
  };

  const notifyMCUOffline = () => {
    toast.error('Không thể điều khiển: MCU Gateway đang offline. Vui lòng kiểm tra kết nối WiFi của thiết bị.');
  };

  const notifyDeviceOffline = () => {
    toast.error('Không thể điều khiển: Thiết bị mất kết nối. Kiểm tra nguồn điện hoặc kết nối của thiết bị.');
  };

  const getDeviceIcon = () => {
    switch (device.type) {
      case DeviceType.LIGHT:
        return <Lightbulb className="h-6 w-6" />;
      case DeviceType.FAN:
        return <Fan className="h-6 w-6" />;
      case DeviceType.DOOR:
        return <DoorOpen className="h-6 w-6" />;
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
    if (!mcuOnline) {
      notifyMCUOffline();
      return;
    }
    if (isDeviceOffline) {
      notifyDeviceOffline();
      return;
    }
    if (!canControl) {
      notifyDenied('điều khiển thiết bị');
      return;
    }
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
        if (!canEdit) {
          notifyDenied('chỉnh sửa thiết bị');
          return;
        }
        onEdit?.(device.id);
        break;
      case 'delete':
        if (!canDelete) {
          notifyDenied('xóa thiết bị');
          return;
        }
        onDelete?.(device.id);
        break;
      case 'turn_on':
        if (!mcuOnline) {
          notifyMCUOffline();
          return;
        }
        if (isDeviceOffline) {
          notifyDeviceOffline();
          return;
        }
        if (!canControl) {
          notifyDenied('điều khiển thiết bị');
          return;
        }
        if (onControl) {
          onControl(device.id, 'TURN_ON');
        } else {
          controlDevice(Number(device.id), 'TURN_ON').catch((error) => {
            console.error('Failed to turn on device:', error);
            toast.error('Không thể bật thiết bị');
          });
        }
        break;
      case 'turn_off':
        if (!mcuOnline) {
          notifyMCUOffline();
          return;
        }
        if (isDeviceOffline) {
          notifyDeviceOffline();
          return;
        }
        if (!canControl) {
          notifyDenied('điều khiển thiết bị');
          return;
        }
        if (onControl) {
          onControl(device.id, 'TURN_OFF');
        } else {
          controlDevice(Number(device.id), 'TURN_OFF').catch((error) => {
            console.error('Failed to turn off device:', error);
            toast.error('Không thể tắt thiết bị');
          });
        }
        break;
      case 'toggle':
        handleToggle();
        break;
    }
  };

  return (
    <Card className={`hover:shadow-lg transition-shadow duration-300 ${!mcuOnline ? 'opacity-75' : ''}`}>
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
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEdit && (
                  <DropdownMenuItem onClick={() => handleMoreAction('edit')}>
                    <Settings className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {canControl && (
                  <>
                    <DropdownMenuItem
                      onClick={() => handleMoreAction('turn_on')}
                      disabled={!!disableReason}
                      className={disableReason ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      {disableReason ? (
                        <Ban className={`mr-2 h-4 w-4 ${disableReason === 'mcu_offline' ? 'text-orange-500' : 'text-red-500'}`} />
                      ) : (
                        <Power className="mr-2 h-4 w-4" />
                      )}
                      Turn On {disableReason && (
                        <span className={`ml-1 text-xs ${disableReason === 'mcu_offline' ? 'text-orange-500' : 'text-red-500'}`}>
                          ({disableReason === 'mcu_offline' ? 'MCU Offline' : 'Device Offline'})
                        </span>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleMoreAction('turn_off')}
                      disabled={!!disableReason}
                      className={disableReason ? 'opacity-50 cursor-not-allowed' : ''}
                    >
                      {disableReason ? (
                        <Ban className={`mr-2 h-4 w-4 ${disableReason === 'mcu_offline' ? 'text-orange-500' : 'text-red-500'}`} />
                      ) : (
                        <PowerOff className="mr-2 h-4 w-4" />
                      )}
                      Turn Off {disableReason && (
                        <span className={`ml-1 text-xs ${disableReason === 'mcu_offline' ? 'text-orange-500' : 'text-red-500'}`}>
                          ({disableReason === 'mcu_offline' ? 'MCU Offline' : 'Device Offline'})
                        </span>
                      )}
                    </DropdownMenuItem>
                  </>
                )}
                {canDelete && (
                  <DropdownMenuItem
                    onClick={() => handleMoreAction('delete')}
                    className="text-red-600 focus:text-red-600"
                  >
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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

        <div className="space-y-1">
          {device.deviceCode && (
            <p className="text-sm text-muted-foreground truncate">
              Code: {device.deviceCode}
            </p>
          )}

          {/* GPIO Pin Display */}
          {device.gpioPin && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Cpu className="h-3.5 w-3.5" />
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                      GPIO {device.gpioPin}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>ESP32 GPIO Pin: {device.gpioPin}</p>
                  <p className="text-xs text-muted-foreground">Điều khiển trực tiếp từ ESP32</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-2 border-t flex-col gap-2">
        {/* Warning Message */}
        {disableReason && canControl && (
          <div className={`w-full flex items-center gap-2 text-sm rounded-md px-2 py-1.5 ${disableReason === 'mcu_offline'
            ? 'text-orange-600 bg-orange-50'
            : 'text-red-600 bg-red-50'
            }`}>
            {disableReason === 'mcu_offline' ? (
              <>
                <WifiOff className="h-4 w-4 flex-shrink-0" />
                <span>MCU Gateway offline - không thể điều khiển</span>
              </>
            ) : (
              <>
                <Ban className="h-4 w-4 flex-shrink-0" />
                <span>Thiết bị mất kết nối - không thể điều khiển</span>
              </>
            )}
          </div>
        )}

        <div className="flex items-center justify-between w-full">
          {/* Switch Control with Tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center space-x-2 ${!canActuallyControl ? 'cursor-not-allowed' : ''}`}>
                  <div className="relative">
                    <Switch
                      checked={device.status === DeviceStatus.ON}
                      onCheckedChange={handleToggle}
                      disabled={!canActuallyControl}
                      className={!canActuallyControl ? 'opacity-50' : ''}
                    />
                    {disableReason && canControl && (
                      <div className={`absolute -top-1 -right-1 rounded-full p-0.5 ${disableReason === 'mcu_offline' ? 'bg-orange-500' : 'bg-red-500'
                        }`}>
                        <Ban className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <span className={`text-sm ${!canActuallyControl ? 'text-muted-foreground' : ''}`}>
                    {device.status === DeviceStatus.ON ? 'On' : 'Off'}
                  </span>
                </div>
              </TooltipTrigger>
              {disableReason && canControl && (
                <TooltipContent side="top" className={`text-white ${disableReason === 'mcu_offline' ? 'bg-orange-600' : 'bg-red-600'
                  }`}>
                  <div className="flex items-center gap-2">
                    <Ban className="h-4 w-4" />
                    <span>
                      {disableReason === 'mcu_offline'
                        ? 'MCU Gateway đang offline'
                        : 'Thiết bị mất kết nối'}
                    </span>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Toggle Button with Tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={!canActuallyControl ? 'cursor-not-allowed' : ''}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggle()}
                    disabled={!canActuallyControl}
                    className={`relative ${!canActuallyControl ? 'opacity-50' : ''}`}
                  >
                    {disableReason && canControl ? (
                      <Ban className={`h-4 w-4 mr-1 ${disableReason === 'mcu_offline' ? 'text-orange-500' : 'text-red-500'
                        }`} />
                    ) : (
                      <Zap className="h-4 w-4 mr-1" />
                    )}
                    Toggle
                  </Button>
                </div>
              </TooltipTrigger>
              {disableReason && canControl && (
                <TooltipContent side="top" className={`text-white ${disableReason === 'mcu_offline' ? 'bg-orange-600' : 'bg-red-600'
                  }`}>
                  <div className="flex items-center gap-2">
                    <Ban className="h-4 w-4" />
                    <span>
                      {disableReason === 'mcu_offline'
                        ? 'Không thể điều khiển - MCU offline'
                        : 'Không thể điều khiển - Thiết bị offline'}
                    </span>
                  </div>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardFooter>
    </Card>
  );
};

export default DeviceCard;