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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast'; // Import hook toast
import type { HomeMember } from '@/types/home';

interface UpdateRoleModalProps {
  open: boolean;
  onClose: () => void;
  member: HomeMember;
  homeId: number;
}

export default function UpdateRoleModal({
  open,
  onClose,
  member,
  homeId,
}: UpdateRoleModalProps) {
  const { updateMemberRole, isLoading } = useHomeStore();
  const [newRole, setNewRole] = useState<string>(member.role);
  const { toast } = useToast(); // Sử dụng toast

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newRole === member.role) {
      onClose();
      return;
    }

    try {
      await updateMemberRole(homeId, member.userId, newRole);
      
      // Thông báo thành công (Store cũng có thể đã toast, nhưng thêm ở đây để chắc chắn UX mượt mà)
      // Nếu store đã có toast success thì bạn có thể bỏ dòng này
      /* toast({
        title: "Cập nhật thành công",
        description: `Đã thay đổi vai trò của ${member.username} thành ${newRole}`,
      });
      */
      
      onClose();
    } catch (err: any) {
      console.error('Failed to update role:', err);
      // Hiển thị lỗi nếu có sự cố
      const errorDetail = err.response?.data?.detail || err.response?.data?.message || 'Có lỗi xảy ra';
      toast({
        variant: "destructive",
        title: "Lỗi cập nhật",
        description: errorDetail,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Thay đổi vai trò</DialogTitle>
          <DialogDescription className="text-center">
            Cập nhật vai trò của <strong>{member.username}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Current Role */}
            <div className="space-y-2">
              <Label>Vai trò hiện tại</Label>
              <div className="p-3 bg-muted rounded-md text-sm font-medium">
                {member.role}
              </div>
            </div>

            {/* New Role */}
            <div className="space-y-2">
              <Label htmlFor="role">Vai trò mới</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  <SelectItem value="GUEST">Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Role Info */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-md text-sm">
              <p className="font-medium mb-1">Quyền hạn theo vai trò:</p>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {newRole === 'ADMIN' && (
                  <>
                    <li>• Quản lý thiết bị, phòng, tự động hóa</li>
                    <li>• Mời thành viên mới</li>
                    <li>• Xem logs và thống kê</li>
                  </>
                )}
                {newRole === 'MEMBER' && (
                  <>
                    <li>• Xem và điều khiển thiết bị</li>
                    <li>• Thực thi tự động hóa và ngữ cảnh</li>
                    <li>• Xem danh sách thành viên</li>
                  </>
                )}
                {newRole === 'GUEST' && (
                  <>
                    <li>• Chỉ xem thiết bị</li>
                    <li>• Không thể điều khiển</li>
                    <li>• Xem giới hạn</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading || newRole === member.role}>
              {isLoading ? 'Đang cập nhật...' : 'Cập nhật'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}