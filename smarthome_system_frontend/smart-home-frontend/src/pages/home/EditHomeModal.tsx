import { useState, useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Home } from 'lucide-react';
import { toast } from 'sonner';

interface EditHomeModalProps {
  open: boolean;
  onClose: () => void;
  home: any | null;
  onSuccess: (home: any) => void;
}

interface FormErrors {
  name?: string;
  address?: string;
  timeZone?: string;
}

// Danh sách múi giờ phổ biến (dùng chung với CreateHomeModal)
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

export default function EditHomeModal({ open, onClose, home, onSuccess }: EditHomeModalProps) {
  const { updateHome } = useHomeStore();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (home) {
      setFormData({
        name: home.name || '',
        address: home.address || '',
        timeZone: home.timeZone || 'Asia/Ho_Chi_Minh',
      });
      setErrors({});
    }
  }, [home]);

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

    // Validate múi giờ
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

    if (!home) {
      toast.error('Không tìm thấy thông tin nhà');
      return;
    }

    setIsSubmitting(true);
    try {
      await updateHome(
        home.id, 
        formData.name.trim(), 
        formData.address.trim(), 
        formData.timeZone
      );
      
      const updatedHome = {
        ...home,
        name: formData.name.trim(),
        address: formData.address.trim(),
        timeZone: formData.timeZone,
      };
      
      onSuccess(updatedHome);
      toast.success('Cập nhật thông tin nhà thành công!');
    } catch (error: any) {
      console.error('Update home error:', error);
      toast.error(`Không thể cập nhật nhà: ${error.message || 'Có lỗi xảy ra'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (home) {
      setFormData({
        name: home.name || '',
        address: home.address || '',
        timeZone: home.timeZone || 'Asia/Ho_Chi_Minh',
      });
    }
    setErrors({});
    onClose();
  };

  // Tìm tên múi giờ hiện tại để hiển thị
  const getCurrentTimeZoneLabel = () => {
    const tz = TIME_ZONES.find(tz => tz.value === formData.timeZone);
    return tz ? tz.label : formData.timeZone;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Chỉnh sửa thông tin nhà
            </DialogTitle>
            <DialogDescription>
              Cập nhật thông tin của ngôi nhà
              {home?.name && (
                <span className="font-medium ml-1">"{home.name}"</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Tên nhà */}
            <div className="grid gap-2">
              <Label htmlFor="name">
                Tên nhà <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Nhập tên nhà"
                className={errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                maxLength={50}
              />
              <div className="flex justify-between items-center">
                {errors.name ? (
                  <p className="text-sm text-red-500">{errors.name}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Từ 3-50 ký tự
                  </p>
                )}
                <span className="text-xs text-muted-foreground">
                  {formData.name.length}/50
                </span>
              </div>
            </div>

            {/* Địa chỉ */}
            <div className="grid gap-2">
              <Label htmlFor="address">Địa chỉ</Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Nhập địa chỉ chi tiết"
                rows={3}
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
            <div className="grid gap-2">
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
                  <SelectValue placeholder="Chọn múi giờ">
                    {getCurrentTimeZoneLabel()}
                  </SelectValue>
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
                  Múi giờ hiện tại: {getCurrentTimeZoneLabel()}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                'Cập nhật'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}