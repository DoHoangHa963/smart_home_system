// pages/home/CreateHomeModal.tsx
import { useState } from 'react';
import { useHomeStore } from '@/store/homeStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Home } from 'lucide-react';
import type { Home as HomeType } from '@/types/home';
import { toast } from 'sonner';
import { getUserFriendlyError } from '@/utils/errorHandler';

interface CreateHomeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (home: HomeType) => void;
}

interface FormErrors {
  name?: string;
  address?: string;
  timeZone?: string;
}

// Danh sách múi giờ phổ biến
const TIME_ZONES = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Việt Nam (GMT+7)' },
  { value: 'Asia/Bangkok', label: 'Thái Lan (GMT+7)' },
  { value: 'Asia/Singapore', label: 'Singapore (GMT+8)' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (GMT+8)' },
  { value: 'Asia/Shanghai', label: 'Trung Quốc (GMT+8)' },
  { value: 'Asia/Taipei', label: 'Đài Loan (GMT+8)' },
  { value: 'Asia/Seoul', label: 'Hàn Quốc (GMT+9)' },
  { value: 'Asia/Tokyo', label: 'Nhật Bản (GMT+9)' },
  { value: 'Australia/Perth', label: 'Úc (Perth GMT+8)' },
  { value: 'Australia/Sydney', label: 'Úc (Sydney GMT+10)' },
  { value: 'Pacific/Auckland', label: 'New Zealand (GMT+12)' },
  { value: 'Europe/London', label: 'Anh (GMT+0)' },
  { value: 'Europe/Paris', label: 'Pháp (GMT+1)' },
  { value: 'Europe/Berlin', label: 'Đức (GMT+1)' },
  { value: 'Europe/Moscow', label: 'Nga (Moscow GMT+3)' },
  { value: 'America/New_York', label: 'USA (New York GMT-5)' },
  { value: 'America/Chicago', label: 'USA (Chicago GMT-6)' },
  { value: 'America/Denver', label: 'USA (Denver GMT-7)' },
  { value: 'America/Los_Angeles', label: 'USA (Los Angeles GMT-8)' },
  { value: 'America/Toronto', label: 'Canada (Toronto GMT-5)' },
  { value: 'America/Sao_Paulo', label: 'Brazil (GMT-3)' },
];

export default function CreateHomeModal({ open, onClose, onSuccess }: CreateHomeModalProps) {
  const { createHome, isLoading } = useHomeStore();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    timeZone: 'Asia/Ho_Chi_Minh', // Mặc định Việt Nam
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate tên nhà
    if (!formData.name.trim()) {
      newErrors.name = 'Tên nhà không được để trống';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Tên nhà phải có ít nhất 3 ký tự';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Tên nhà không được quá 50 ký tự';
    } else if (!/^[a-zA-Z0-9À-ỹ\s.,-]+$/.test(formData.name)) {
      newErrors.name = 'Tên nhà chỉ được chứa chữ cái, số, dấu cách và các ký tự: ,.-';
    }

    // Validate địa chỉ
    if (formData.address.trim().length > 200) {
      newErrors.address = 'Địa chỉ không được quá 200 ký tự';
    }

    // Validate múi giờ (luôn có giá trị vì là select)
    if (!formData.timeZone) {
      newErrors.timeZone = 'Vui lòng chọn múi giờ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleTimeZoneChange = (value: string) => {
    setFormData((prev) => ({ ...prev, timeZone: value }));
    if (errors.timeZone) {
      setErrors((prev) => ({ ...prev, timeZone: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const newHome = await createHome(
        formData.name.trim(),
        formData.address.trim() || undefined,
        formData.timeZone || 'Asia/Ho_Chi_Minh'
      );

      // Reset form
      setFormData({
        name: '',
        address: '',
        timeZone: 'Asia/Ho_Chi_Minh',
      });
      setErrors({});

      // Call success callback
      if (onSuccess) {
        onSuccess(newHome);
      }

      toast.success('Tạo nhà thành công!');
      onClose();
    } catch (error: any) {
      toast.error(getUserFriendlyError(error));
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      address: '',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Home className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Tạo nhà mới</DialogTitle>
          <DialogDescription className="text-center">
            Tạo một ngôi nhà mới để quản lý thiết bị thông minh của bạn
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Tên nhà */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Tên nhà <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Ví dụ: Nhà của tôi, Biệt thự Hạ Long..."
                value={formData.name}
                onChange={handleInputChange}
                className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                maxLength={50}
              />
              <div className="flex justify-between items-center">
                {errors.name ? (
                  <p className="text-sm text-red-500">{errors.name}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Từ 3-50 ký tự, có thể chứa chữ, số, dấu cách, dấu phẩy, dấu chấm, gạch ngang
                  </p>
                )}
                <span className="text-xs text-muted-foreground">
                  {formData.name.length}/50
                </span>
              </div>
            </div>

            {/* Địa chỉ */}
            <div className="space-y-2">
              <Label htmlFor="address">Địa chỉ</Label>
              <Input
                id="address"
                name="address"
                placeholder="Ví dụ: Số 123, Đường Nguyễn Trãi, Quận 1, TP.HCM"
                value={formData.address}
                onChange={handleInputChange}
                className={errors.address ? 'border-red-500 focus-visible:ring-red-500' : ''}
                maxLength={200}
              />
              <div className="flex justify-between items-center">
                {errors.address ? (
                  <p className="text-sm text-red-500">{errors.address}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Địa chỉ chi tiết giúp xác định vị trí nhà
                  </p>
                )}
                <span className="text-xs text-muted-foreground">
                  {formData.address.length}/200
                </span>
              </div>
            </div>

            {/* Múi giờ */}
            <div className="space-y-2">
              <Label htmlFor="timeZone">
                Múi giờ <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.timeZone}
                onValueChange={handleTimeZoneChange}
              >
                <SelectTrigger 
                  id="timeZone"
                  className={errors.timeZone ? 'border-red-500 focus:ring-red-500' : ''}
                >
                  <SelectValue placeholder="Chọn múi giờ" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_ZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.timeZone ? (
                <p className="text-sm text-red-500">{errors.timeZone}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Múi giờ sẽ được sử dụng cho các tự động hóa và lịch trình
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Đang tạo...' : 'Tạo nhà'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}