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
import { PlusCircle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

// --- CẬP NHẬT SCHEMA (Đồng bộ với Backend) ---
const formSchema = z.object({
  name: z.string().trim()
    .min(1, 'Vui lòng nhập tên thiết bị')
    .max(100, 'Tên quá dài'),
    
  deviceCode: z.string().trim()
    .min(1, 'Vui lòng nhập mã thiết bị')
    .min(3, 'Mã phải có ít nhất 3 ký tự') // Backend yêu cầu min size
    .max(50, 'Mã quá dài (tối đa 50 ký tự)')
    // [QUAN TRỌNG] Regex khớp với BE: ^[A-Za-z0-9_]+$
    // Chỉ cho phép: Chữ hoa, Chữ thường, Số, Gạch dưới (_)
    // KHÔNG cho phép: Gạch ngang (-), Khoảng trắng, Ký tự đặc biệt khác
    .regex(/^[a-zA-Z0-9_]+$/, 'Mã chứa chữ cái, số và dấu gạch dưới (_)'), 

  deviceType: z.nativeEnum(DeviceType).refine((val) => Object.values(DeviceType).includes(val), {
    message: "Vui lòng chọn loại thiết bị hợp lệ"
}),
  
  roomId: z.string().min(1, 'Vui lòng chọn phòng'),
  metadata: z.string().optional(),
});

interface AddDeviceDialogProps {
  rooms?: Array<{ id: number; name: string }>; 
  homeId: number;
  fixedRoomId?: number;     
  fixedRoomName?: string;   
  trigger?: React.ReactNode; 
}

const AddDeviceDialog: React.FC<AddDeviceDialogProps> = ({ 
  rooms: propRooms = [], 
  homeId, 
  fixedRoomId, 
  fixedRoomName,
  trigger 
}) => {
  const [open, setOpen] = useState(false);
  const { createDevice, isLoading } = useDeviceStore();

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
      metadata: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: '',
        deviceCode: '',
        deviceType: DeviceType.LIGHT,
        roomId: fixedRoomId ? fixedRoomId.toString() : '',
        metadata: '',
      });
    }
  }, [open, fixedRoomId, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    // Validate homeId
    const validHomeId = Number(homeId);
    if (!homeId || isNaN(validHomeId)) {
      toast.error("Lỗi: Không tìm thấy ID Nhà hợp lệ");
      return;
    }

    const payload = {
      name: values.name,
      deviceCode: values.deviceCode, // Zod đã đảm bảo format đúng
      deviceType: values.deviceType,
      metadata: values.metadata || "",
      roomId: Number(values.roomId),
      homeId: validHomeId,
    };

    console.log("📤 Payload:", payload);

    try {
      await createDevice(payload);
      toast.success(`Đã thêm thiết bị "${values.name}" thành công!`);
      setOpen(false);
    } catch (error: any) {
      console.error("❌ Error:", error);
      
      const responseData = error.response?.data;
      const message = String(responseData?.message || responseData || "Có lỗi xảy ra").toLowerCase();

      // 1. Xử lý lỗi trùng mã (Backend trả về: Device code already exists)
      if (message.includes("device code already exists") || message.includes("exists")) {
        form.setError("deviceCode", { 
          type: "manual", 
          message: "Mã thiết bị này đã được sử dụng" 
        });
        form.setFocus("deviceCode");
        return;
      }
      
      // 2. Xử lý lỗi format (Nếu frontend lọt validation)
      if (message.includes("device_code_pattern") || message.includes("format")) {
         form.setError("deviceCode", { 
          type: "manual", 
          message: "Mã chứa ký tự không hợp lệ (chỉ được dùng chữ, số, _)" 
        });
        return;
      }

      toast.error(responseData?.message || "Thêm thiết bị thất bại");
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())} 
                        />
                      </FormControl>
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
                      <FormLabel>Phòng <span className="text-red-500">*</span></FormLabel>
                      {fixedRoomId ? (
                         <FormControl><Input value={fixedRoomName} disabled className="bg-muted" /></FormControl>
                      ) : (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={isLoadingRooms ? "Đang tải..." : "Chọn phòng"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {roomsToDisplay.map((room) => (
                                <SelectItem key={room.id} value={room.id.toString()}>{room.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            
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