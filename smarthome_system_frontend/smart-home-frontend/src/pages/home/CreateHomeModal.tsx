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
import { Home } from 'lucide-react';
import type { Home as HomeType } from '@/types/home';

interface CreateHomeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (home: HomeType) => void;
}

export default function CreateHomeModal({ open, onClose, onSuccess }: CreateHomeModalProps) {
  const { createHome, isLoading } = useHomeStore();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    timeZone: 'Asia/Ho_Chi_Minh',
  });

  const [errors, setErrors] = useState({
    name: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors.name && name === 'name') {
      setErrors({ name: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      setErrors({ name: 'Tên nhà không được để trống' });
      return;
    }

    try {
      const newHome = await createHome(
        formData.name,
        formData.address || undefined,
        formData.timeZone || undefined
      );

      // Reset form
      setFormData({
        name: '',
        address: '',
        timeZone: 'Asia/Ho_Chi_Minh',
      });

      // Call success callback
      if (onSuccess) {
        onSuccess(newHome);
      }

      onClose();
    } catch (error) {
      console.error('Failed to create home:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      address: '',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
    setErrors({ name: '' });
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
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Tên nhà <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Ví dụ: Nhà của tôi"
                value={formData.name}
                onChange={handleChange}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address">Địa chỉ</Label>
              <Input
                id="address"
                name="address"
                placeholder="Ví dụ: 123 Nguyễn Trãi, HCM"
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timeZone">Múi giờ</Label>
              <Input
                id="timeZone"
                name="timeZone"
                placeholder="Asia/Ho_Chi_Minh"
                value={formData.timeZone}
                onChange={handleChange}
              />
              <p className="text-xs text-muted-foreground">
                Múi giờ sẽ được sử dụng cho các tự động hóa và lịch trình
              </p>
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