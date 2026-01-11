import React, { useState, useEffect } from 'react';
import { useDeviceStore } from '@/store/deviceStore';
import { useRoomsByHome } from '@/hooks/useRoom'; // [CHANGE] Import hook
import { DeviceType } from '@/types/device';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const formSchema = z.object({
  name: z.string().min(2, 'Tên thiết bị phải có ít nhất 2 ký tự'),
  deviceCode: z.string().min(3, 'Mã thiết bị phải có ít nhất 3 ký tự'),
  deviceType: z.nativeEnum(DeviceType),
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
  rooms: propRooms = [], // [CHANGE] Đổi tên prop để tránh trùng, dùng làm fallback
  homeId, 
  fixedRoomId, 
  fixedRoomName,
  trigger 
}) => {
  const [open, setOpen] = useState(false);
  const { createDevice, isLoading } = useDeviceStore();

  // [CHANGE] Fetch danh sách phòng trực tiếp từ API
  const { data: fetchedRooms, isLoading: isLoadingRooms } = useRoomsByHome(homeId, {
    enabled: open && !fixedRoomId, // Chỉ fetch khi dialog mở và không bị fix phòng
  });

  // [CHANGE] Ưu tiên dữ liệu từ hook, nếu không có thì dùng props
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
    try {
      await createDevice({
        ...values,
        roomId: parseInt(values.roomId),
        homeId,
      });
      setOpen(false);
    } catch (error: any) {
      console.error(error);
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
          <DialogDescription>
            {fixedRoomName 
              ? `Thêm thiết bị vào ${fixedRoomName}`
              : "Nhập thông tin thiết bị mới vào nhà của bạn."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên thiết bị *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ví dụ: Đèn trần" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="deviceCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mã thiết bị (Code) *</FormLabel>
                      <FormControl>
                        <Input placeholder="LIGHT_001" {...field} />
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
                      <FormLabel>Loại thiết bị *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn loại" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.values(DeviceType).map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
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
                      <FormLabel>Phòng *</FormLabel>
                      {fixedRoomId ? (
                         <FormControl>
                            <Input value={fixedRoomName} disabled className="bg-muted" />
                         </FormControl>
                      ) : (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={isLoadingRooms ? "Đang tải phòng..." : "Chọn phòng"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {/* [CHANGE] Sử dụng roomsToDisplay thay vì rooms prop cũ */}
                              {roomsToDisplay.map((room) => (
                                <SelectItem key={room.id} value={room.id.toString()}>
                                  {room.name}
                                </SelectItem>
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
                  <FormLabel>Thông tin thêm (Metadata)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Ghi chú thêm về thiết bị..."
                      className="resize-none h-20"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Đang tạo...' : 'Tạo thiết bị'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDeviceDialog;