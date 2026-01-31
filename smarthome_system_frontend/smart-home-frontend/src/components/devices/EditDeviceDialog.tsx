import React, { useState, useEffect } from 'react';
import { useDeviceStore } from '@/store/deviceStore';
import { useRoomsByHome } from '@/hooks/useRoom';
import { DeviceType, DeviceStatus, DeviceResponse } from '@/types/device';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Cpu, AlertCircle, Settings } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { getUserFriendlyError } from '@/utils/errorHandler';
import { mcuApi, GPIOPin } from '@/lib/api/mcu.api';

const formSchema = z.object({
  name: z.string().trim()
    .min(1, 'Vui lòng nhập tên thiết bị')
    .max(100, 'Tên quá dài'),
  roomId: z.string().min(1, 'Vui lòng chọn phòng'),
  gpioPin: z.string().optional(),
  metadata: z.string().optional(),
});

interface EditDeviceDialogProps {
  device: DeviceResponse | null;
  homeId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const EditDeviceDialog: React.FC<EditDeviceDialogProps> = ({
  device,
  homeId,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [gpioPins, setGpioPins] = useState<GPIOPin[]>([]);
  const [isLoadingGPIO, setIsLoadingGPIO] = useState(false);
  const [gpioError, setGpioError] = useState<string | null>(null);
  const { updateDevice, isLoading } = useDeviceStore();

  const { data: fetchedRooms, isLoading: isLoadingRooms } = useRoomsByHome(homeId, {
    enabled: open,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      roomId: '',
      gpioPin: '',
      metadata: '',
    },
  });

  // Fetch GPIO pins từ ESP32 khi dialog mở
  useEffect(() => {
    const fetchGPIOPins = async () => {
      if (!open || !homeId) return;

      setIsLoadingGPIO(true);
      setGpioError(null);

      try {
        const response = await mcuApi.getAvailableGPIOPins(homeId);
        if (response && response.pins) {
          setGpioPins(response.pins);
        } else {
          setGpioPins([]);
          setGpioError('MCU Gateway chưa được kết nối.');
        }
      } catch (error: any) {
        console.error('Failed to fetch GPIO pins:', error);
        setGpioPins([]);
        setGpioError('Không thể kết nối với ESP32.');
      } finally {
        setIsLoadingGPIO(false);
      }
    };

    fetchGPIOPins();
  }, [open, homeId]);

  // Populate form khi device thay đổi
  useEffect(() => {
    if (device && open) {
      form.reset({
        name: device.name || '',
        roomId: device.roomId?.toString() || '',
        gpioPin: device.gpioPin?.toString() || '',
        metadata: device.metadata || '',
      });
    }
  }, [device, open, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!device) return;

    const payload = {
      name: values.name,
      roomId: Number(values.roomId),
      gpioPin: values.gpioPin && values.gpioPin !== '__none__' ? Number(values.gpioPin) : null,
      metadata: values.metadata || '',
    };

    try {
      await updateDevice(device.id, payload);
      toast.success(`Đã cập nhật thiết bị "${values.name}"!`);
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      const responseData = error.response?.data;
      const errorCode = responseData?.code;
      const message = responseData?.message || "";

      // Handle GPIO pin already in use
      if (errorCode === 5011) {
        const errorMessage = message || "GPIO pin này đã được sử dụng bởi thiết bị khác";
        form.setError("gpioPin", {
          type: "manual",
          message: errorMessage
        });
        toast.error(errorMessage);
        return;
      }

      toast.error(getUserFriendlyError(error));
    }
  };

  if (!device) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Chỉnh sửa thiết bị
          </DialogTitle>
          <DialogDescription>
            Cập nhật thông tin cho thiết bị <strong>{device.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Device Info (Read-only) */}
            <div className="bg-muted/50 p-3 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Mã thiết bị:</span>
                <Badge variant="outline" className="font-mono">{device.deviceCode}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Loại:</span>
                <Badge>{device.deviceType}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Trạng thái:</span>
                <Badge variant={device.deviceStatus === DeviceStatus.ON || device.deviceStatus === DeviceStatus.ONLINE ? 'default' : 'secondary'}>
                  {device.deviceStatus}
                </Badge>
              </div>
              {device.gpioPin && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">GPIO Pin hiện tại:</span>
                  <Badge variant="outline" className="font-mono">GPIO {device.gpioPin}</Badge>
                </div>
              )}
            </div>

            {/* Editable fields */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên thiết bị <span className="text-red-500">*</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Ví dụ: Đèn phòng khách" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="roomId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phòng <span className="text-red-500">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingRooms ? "Đang tải..." : "Chọn phòng"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fetchedRooms?.map((room) => (
                        <SelectItem key={room.id} value={room.id.toString()}>{room.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* GPIO Pin Selection */}
            <FormField
              control={form.control}
              name="gpioPin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    GPIO Pin (ESP32)
                  </FormLabel>

                  {gpioError ? (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded-md">
                      <AlertCircle className="h-4 w-4" />
                      {gpioError}
                    </div>
                  ) : isLoadingGPIO ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải GPIO pins từ ESP32...
                    </div>
                  ) : (
                    <Select
                      onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
                      value={field.value || "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn GPIO pin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">-- Không chọn --</SelectItem>
                        {gpioPins.map((pin) => (
                          <SelectItem key={pin.gpio} value={pin.gpio.toString()}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                                GPIO {pin.gpio}
                              </span>
                              <span>{pin.name}</span>
                              {pin.controllable ? (
                                <Badge variant="default" className="text-xs">Điều khiển</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Sensor</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Chọn GPIO pin trên ESP32 để điều khiển thiết bị này. <strong>Mỗi GPIO pin chỉ có thể được gán cho một thiết bị.</strong>
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="metadata"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ghi chú</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Vị trí lắp đặt, thông tin thêm..."
                      className="resize-none h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Hủy bỏ
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditDeviceDialog;
