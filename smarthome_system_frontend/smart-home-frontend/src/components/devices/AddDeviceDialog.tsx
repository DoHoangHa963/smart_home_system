import React, { useState, useEffect } from 'react';
import { useDeviceStore } from '@/store/deviceStore';
import { useRoomsByHome } from '@/hooks/useRoom';
import { DeviceType } from '@/types/device';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Loader2, Cpu, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { getUserFriendlyError } from '@/utils/errorHandler';
import { mcuApi, GPIOPin, GPIOPinsResponse } from '@/lib/api/mcu.api';

// --- CẬP NHẬT SCHEMA (Đồng bộ với Backend) ---
const formSchema = z.object({
  name: z.string().trim()
    .min(2, 'Tên thiết bị phải có ít nhất 2 ký tự') // Updated to match BE (min 2)
    .max(100, 'Tên quá dài'),

  deviceCode: z.string().trim()
    .min(1, 'Vui lòng nhập mã thiết bị')
    .min(3, 'Mã phải có ít nhất 3 ký tự') // Backend yêu cầu min size
    .max(50, 'Mã quá dài (tối đa 50 ký tự)')
    // [QUAN TRỌNG] Regex khớp với BE: ^[A-Za-z0-9_]+$
    .regex(/^[a-zA-Z0-9_]+$/, 'Mã chỉ được chứa chữ cái, số và dấu gạch dưới (_)'),

  deviceType: z.nativeEnum(DeviceType).refine((val) => Object.values(DeviceType).includes(val), {
    message: "Vui lòng chọn loại thiết bị hợp lệ"
  }),

  // Room is optional - some devices like main door don't belong to a specific room
  roomId: z.string().optional(),

  // GPIO Pin (giống như Virtual Pin trong Blynk)
  gpioPin: z.string().optional(),

  metadata: z.string().optional(),
});

// ... (interface props remains the same)

const AddDeviceDialog: React.FC<AddDeviceDialogProps> = ({
  rooms: propRooms = [],
  homeId,
  fixedRoomId,
  fixedRoomName,
  trigger
}) => {
  const [open, setOpen] = useState(false);
  const [gpioPins, setGpioPins] = useState<GPIOPin[]>([]);
  const [isLoadingGPIO, setIsLoadingGPIO] = useState(false);
  const [gpioError, setGpioError] = useState<string | null>(null);
  const { createDevice, isLoading, setError } = useDeviceStore();

  const { data: fetchedRooms, isLoading: isLoadingRooms } = useRoomsByHome(homeId, {
    enabled: open && !fixedRoomId,
  });

  const roomsToDisplay = fetchedRooms && fetchedRooms.length > 0 ? fetchedRooms : propRooms;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      deviceCode: '',
      deviceType: DeviceType.LIGHT,
      roomId: fixedRoomId ? fixedRoomId.toString() : '',
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
          console.log('📍 Loaded GPIO pins from ESP32:', response.pins);
        } else {
          setGpioPins([]);
          setGpioError('MCU Gateway chưa được kết nối với Home này.');
        }
      } catch (error: any) {
        console.error('Failed to fetch GPIO pins:', error);
        setGpioPins([]);
        setGpioError('Không thể kết nối với ESP32. Đảm bảo ESP32 đang online.');
      } finally {
        setIsLoadingGPIO(false);
      }
    };

    fetchGPIOPins();
  }, [open, homeId]);

  useEffect(() => {
    if (open) {
      // Clear form và error state khi mở dialog
      form.reset({
        name: '',
        deviceCode: '',
        deviceType: DeviceType.LIGHT,
        roomId: fixedRoomId ? fixedRoomId.toString() : '',
        gpioPin: '',
        metadata: '',
      });
      setDeviceCodeWarning(null);
      // Clear error state trong store để tránh hiển thị nút "Thử lại" ở trang chính
      setError(null);
    }
  }, [open, fixedRoomId, form, setError]);

  // Auto-fill device code khi chọn GPIO pin
  const selectedDeviceType = form.watch('deviceType');
  const selectedGpioPin = form.watch('gpioPin');
  const [deviceCodeWarning, setDeviceCodeWarning] = useState<string | null>(null);

  useEffect(() => {
    if (selectedGpioPin) {
      const pin = gpioPins.find(p => p.gpio.toString() === selectedGpioPin);
      if (pin) {
        // Auto-fill device code từ pin.code nếu trống
        const currentCode = form.getValues('deviceCode');
        if (!currentCode) {
          form.setValue('deviceCode', pin.code);
          // Clear warning khi auto-fill
          setDeviceCodeWarning(null);
        }
        // Auto-fill device type từ pin
        if (pin.deviceType) {
          const mappedType = mapDeviceTypeFromGPIO(pin.deviceType);
          if (mappedType) {
            form.setValue('deviceType', mappedType);
          }
        }
      }
    } else {
      // Clear warning khi không chọn GPIO pin
      setDeviceCodeWarning(null);
    }
  }, [selectedGpioPin, gpioPins, form]);

  // Map device type từ GPIO
  const mapDeviceTypeFromGPIO = (gpioDeviceType: string): DeviceType | null => {
    const mapping: Record<string, DeviceType> = {
      'LIGHT': DeviceType.LIGHT,
      'FAN': DeviceType.FAN,
      'DOOR': DeviceType.DOOR,
      'SENSOR': DeviceType.SENSOR,
    };
    return mapping[gpioDeviceType] || null;
  };

  // Filter GPIO pins dựa trên device type đã chọn
  const filteredGpioPins = gpioPins.filter(pin => {
    if (!selectedDeviceType) return true;

    // Map device type để filter
    const typeMapping: Record<DeviceType, string[]> = {
      [DeviceType.LIGHT]: ['LIGHT'],
      [DeviceType.FAN]: ['FAN'],
      [DeviceType.DOOR]: ['DOOR'],
      [DeviceType.SENSOR]: ['SENSOR'],
      [DeviceType.SWITCH]: ['LIGHT', 'FAN'],
      [DeviceType.AIR_CONDITIONER]: ['FAN'],
      [DeviceType.CAMERA]: [],
      [DeviceType.CURTAIN]: ['DOOR'],
    };

    const allowedTypes = typeMapping[selectedDeviceType] || [];
    return allowedTypes.length === 0 || allowedTypes.includes(pin.deviceType);
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Validate homeId
    const validHomeId = Number(homeId);
    if (!homeId || isNaN(validHomeId)) {
      toast.error("Không tìm thấy thông tin nhà");
      return;
    }

    const payload = {
      name: values.name,
      deviceCode: values.deviceCode, // Zod đã đảm bảo format đúng
      deviceType: values.deviceType,
      metadata: values.metadata || "",
      roomId: values.roomId && values.roomId.trim() !== '' ? Number(values.roomId) : null,
      homeId: validHomeId,
      // GPIO Pin (giống như Virtual Pin trong Blynk)
      gpioPin: values.gpioPin ? Number(values.gpioPin) : null,
    };

    console.log("📤 Payload with GPIO Pin:", payload);

    try {
      await createDevice(payload);
      toast.success(`Đã thêm thiết bị "${values.name}" thành công!`);
      // Reset form và đóng dialog chỉ khi thành công
      form.reset();
      setDeviceCodeWarning(null);
      setOpen(false);
    } catch (error: any) {
      // Ngăn chặn mọi hành động refresh/reload trang

      const responseData = error.response?.data;
      const errorCode = responseData?.code;
      const detail = String(responseData?.detail || "").toLowerCase();
      const message = String(responseData?.message || "").toLowerCase();
      const fullMessage = detail || message;

      console.log('[AddDeviceDialog] Error details:', {
        code: errorCode,
        detail,
        message,
        status: error.response?.status,
        fullResponse: responseData
      });

      // Handle GPIO pin already in use
      if (errorCode === 5011 ||
        fullMessage.includes("gpio pin") ||
        fullMessage.includes("gpio") && fullMessage.includes("already")) {
        const errorMessage = responseData?.message || "GPIO pin này đã được sử dụng bởi thiết bị khác";
        form.setError("gpioPin", {
          type: "manual",
          message: errorMessage
        });
        form.setFocus("gpioPin");
        toast.error(errorMessage);
        return;
      }

      // Handle duplicate device code
      if (errorCode === 5010 ||
        fullMessage.includes("device code already exists") ||
        fullMessage.includes("device already registered") ||
        (fullMessage.includes("already exists") && fullMessage.includes("device"))) {
        const errorMessage = "Mã thiết bị này đã được sử dụng. Vui lòng chọn mã khác.";
        form.setError("deviceCode", {
          type: "manual",
          message: errorMessage
        });
        setDeviceCodeWarning(errorMessage);
        form.setFocus("deviceCode");
        toast.error(errorMessage);
        return;
      }

      // Handle format errors
      if (fullMessage.includes("device_code_pattern") ||
        fullMessage.includes("invalid device code")) {
        form.setError("deviceCode", {
          type: "manual",
          message: "Mã chứa ký tự không hợp lệ"
        });
        form.setFocus("deviceCode");
        return;
      }

      // Generic error handling
      toast.error(getUserFriendlyError(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ? trigger : (
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" />
            Thêm thiết bị
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Thêm thiết bị mới</DialogTitle>
          <DialogDescription>Nhập thông tin thiết bị.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault(); // Critical to prevent refresh
              form.handleSubmit(onSubmit)(e);
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên thiết bị <span className="text-red-500">*</span></FormLabel>
                    <FormControl><Input placeholder="Ví dụ: Đèn phòng khách" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deviceCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mã thiết bị <span className="text-red-500">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="LIGHT_01"
                        {...field}
                        // Tự động viết hoa (nhưng vẫn phải validate ký tự đặc biệt)
                        onChange={(e) => {
                          field.onChange(e.target.value.toUpperCase());
                          // Clear warning khi user nhập
                          setDeviceCodeWarning(null);
                        }}
                      />
                    </FormControl>
                    {deviceCodeWarning && (
                      <p className="text-sm text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {deviceCodeWarning}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="deviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loại thiết bị <span className="text-red-500">*</span></FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Chọn loại" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {Object.values(DeviceType).map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Phòng
                      <Badge variant="outline" className="ml-2 text-xs">Tùy chọn</Badge>
                    </FormLabel>
                    {fixedRoomId ? (
                      <FormControl><Input value={fixedRoomName} disabled className="bg-muted" /></FormControl>
                    ) : (
                      <Select
                        onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={isLoadingRooms ? "Đang tải..." : "Chọn phòng (tùy chọn)"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">-- Không thuộc phòng --</SelectItem>
                          {roomsToDisplay.map((room) => (
                            <SelectItem key={room.id} value={room.id.toString()}>{room.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Một số thiết bị như cửa chính không thuộc về phòng cụ thể
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* GPIO Pin Selection - Giống như Virtual Pin trong Blynk */}
            <FormField
              control={form.control}
              name="gpioPin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    GPIO Pin (ESP32)
                    <Badge variant="outline" className="ml-1 text-xs">Tùy chọn</Badge>
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
                          <SelectValue placeholder="Chọn GPIO pin để điều khiển" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">-- Không chọn --</SelectItem>
                        {filteredGpioPins.map((pin) => (
                          <SelectItem
                            key={pin.gpio}
                            value={pin.gpio.toString()}
                            disabled={!pin.controllable && selectedDeviceType !== DeviceType.SENSOR}
                          >
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
                              {pin.currentState && (
                                <Badge
                                  variant={pin.currentState === 'ON' || pin.currentState === 'OPEN' ? 'default' : 'outline'}
                                  className="text-xs"
                                >
                                  {pin.currentState}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
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
                  <FormLabel>Ghi chú thêm</FormLabel>
                  <FormControl><Textarea placeholder="Vị trí lắp đặt..." className="resize-none h-20" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy bỏ</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Đang lưu...' : 'Tạo thiết bị'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDeviceDialog;