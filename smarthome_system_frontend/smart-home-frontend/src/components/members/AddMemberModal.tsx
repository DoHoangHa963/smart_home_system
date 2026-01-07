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
import { UserPlus } from 'lucide-react';

interface AddMemberModalProps {
  open: boolean;
  onClose: () => void;
  homeId: number;
}

export default function AddMemberModal({ open, onClose, homeId }: AddMemberModalProps) {
  const { addMember, isLoading } = useHomeStore();
  const [formData, setFormData] = useState({
    identifier: '',
    role: 'MEMBER',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.identifier.trim()) {
      setError('Vui lòng nhập email hoặc username');
      return;
    }

    try {
      await addMember(homeId, formData.identifier, formData.role);
      setFormData({ identifier: '', role: 'MEMBER' });
      setError('');
      onClose();
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  const handleClose = () => {
    setFormData({ identifier: '', role: 'MEMBER' });
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Mời thành viên mới</DialogTitle>
          <DialogDescription className="text-center">
            Thêm người dùng vào nhà bằng email hoặc username
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Identifier */}
            <div className="space-y-2">
              <Label htmlFor="identifier">
                Email hoặc Username <span className="text-red-500">*</span>
              </Label>
              <Input
                id="identifier"
                placeholder="user@example.com hoặc username"
                value={formData.identifier}
                onChange={(e) => {
                  setFormData({ ...formData, identifier: e.target.value });
                  setError('');
                }}
                className={error ? 'border-red-500' : ''}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label htmlFor="role">Vai trò</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="GUEST">Guest</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Vai trò quyết định quyền hạn của thành viên trong nhà
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Đang mời...' : 'Mời thành viên'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}