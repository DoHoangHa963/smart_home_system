import { useState, useEffect, useCallback, useRef } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { homeApi } from '@/lib/api/home.api';
import { HOME_PERMISSIONS } from '@/types/permission';
import type { HomeMember } from '@/types/home';
import { getUserFriendlyError } from '@/utils/errorHandler';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils'; // Đảm bảo bạn có hàm cn, nếu không dùng chuỗi thường cũng được

interface UpdatePermissionsModalProps {
  open: boolean;
  onClose: () => void;
  member: HomeMember;
  homeId: number;
  onSuccess?: () => void;
}

// Group permissions by category - must match backend HomePermission enum
const PERMISSION_GROUPS = {
  'Nhà': [
    HOME_PERMISSIONS.HOME_VIEW,
    HOME_PERMISSIONS.HOME_UPDATE,
    HOME_PERMISSIONS.HOME_DASHBOARD_VIEW,
  ],
  'Thiết bị': [
    HOME_PERMISSIONS.DEVICE_VIEW,
    HOME_PERMISSIONS.DEVICE_CONTROL,
    HOME_PERMISSIONS.DEVICE_CREATE,
    HOME_PERMISSIONS.DEVICE_UPDATE,
    HOME_PERMISSIONS.DEVICE_DELETE,
  ],
  'Phòng': [
    HOME_PERMISSIONS.ROOM_VIEW,
    HOME_PERMISSIONS.ROOM_CREATE,
    HOME_PERMISSIONS.ROOM_UPDATE,
    HOME_PERMISSIONS.ROOM_DELETE,
  ],
  'Tự động hóa': [
    HOME_PERMISSIONS.AUTOMATION_VIEW,
    HOME_PERMISSIONS.AUTOMATION_CREATE,
    HOME_PERMISSIONS.AUTOMATION_UPDATE,
    HOME_PERMISSIONS.AUTOMATION_DELETE,
    HOME_PERMISSIONS.AUTOMATION_EXECUTE,
  ],
  'Ngữ cảnh': [
    HOME_PERMISSIONS.SCENE_VIEW,
    HOME_PERMISSIONS.SCENE_CREATE,
    HOME_PERMISSIONS.SCENE_UPDATE,
    HOME_PERMISSIONS.SCENE_DELETE,
    HOME_PERMISSIONS.SCENE_EXECUTE,
  ],
  'Thành viên': [
    HOME_PERMISSIONS.MEMBER_VIEW,
    HOME_PERMISSIONS.MEMBER_INVITE,
    HOME_PERMISSIONS.MEMBER_UPDATE,
    HOME_PERMISSIONS.MEMBER_REMOVE,
  ],
  'Cài đặt': [
    HOME_PERMISSIONS.HOME_SETTINGS_VIEW,
    HOME_PERMISSIONS.HOME_SETTINGS_UPDATE,
    HOME_PERMISSIONS.HOME_LOGS_VIEW,
  ],
};

const PERMISSION_LABELS: Record<string, string> = {
  [HOME_PERMISSIONS.HOME_VIEW]: 'Xem thông tin nhà',
  [HOME_PERMISSIONS.HOME_UPDATE]: 'Cập nhật thông tin nhà',
  [HOME_PERMISSIONS.HOME_DASHBOARD_VIEW]: 'Xem dashboard',
  [HOME_PERMISSIONS.DEVICE_VIEW]: 'Xem thiết bị',
  [HOME_PERMISSIONS.DEVICE_CONTROL]: 'Điều khiển thiết bị',
  [HOME_PERMISSIONS.DEVICE_CREATE]: 'Thêm thiết bị',
  [HOME_PERMISSIONS.DEVICE_UPDATE]: 'Sửa thiết bị',
  [HOME_PERMISSIONS.DEVICE_DELETE]: 'Xóa thiết bị',
  [HOME_PERMISSIONS.ROOM_VIEW]: 'Xem phòng',
  [HOME_PERMISSIONS.ROOM_CREATE]: 'Thêm phòng',
  [HOME_PERMISSIONS.ROOM_UPDATE]: 'Sửa phòng',
  [HOME_PERMISSIONS.ROOM_DELETE]: 'Xóa phòng',
  [HOME_PERMISSIONS.AUTOMATION_VIEW]: 'Xem tự động hóa',
  [HOME_PERMISSIONS.AUTOMATION_CREATE]: 'Tạo tự động hóa',
  [HOME_PERMISSIONS.AUTOMATION_UPDATE]: 'Sửa tự động hóa',
  [HOME_PERMISSIONS.AUTOMATION_DELETE]: 'Xóa tự động hóa',
  [HOME_PERMISSIONS.AUTOMATION_EXECUTE]: 'Thực thi tự động hóa',
  [HOME_PERMISSIONS.SCENE_VIEW]: 'Xem ngữ cảnh',
  [HOME_PERMISSIONS.SCENE_CREATE]: 'Tạo ngữ cảnh',
  [HOME_PERMISSIONS.SCENE_UPDATE]: 'Sửa ngữ cảnh',
  [HOME_PERMISSIONS.SCENE_DELETE]: 'Xóa ngữ cảnh',
  [HOME_PERMISSIONS.SCENE_EXECUTE]: 'Kích hoạt ngữ cảnh',
  [HOME_PERMISSIONS.MEMBER_VIEW]: 'Xem thành viên',
  [HOME_PERMISSIONS.MEMBER_INVITE]: 'Mời thành viên',
  [HOME_PERMISSIONS.MEMBER_UPDATE]: 'Cập nhật thành viên',
  [HOME_PERMISSIONS.MEMBER_REMOVE]: 'Xóa thành viên',
  [HOME_PERMISSIONS.HOME_SETTINGS_VIEW]: 'Xem cài đặt',
  [HOME_PERMISSIONS.HOME_SETTINGS_UPDATE]: 'Cập nhật cài đặt',
  [HOME_PERMISSIONS.HOME_LOGS_VIEW]: 'Xem nhật ký',
};

export default function UpdatePermissionsModal({
    open,
    onClose,
    member,
    homeId,
    onSuccess,
  }: UpdatePermissionsModalProps) {
    const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const lastMemberIdRef = useRef<string | null>(null);
  
    const fetchPermissions = useCallback(async () => {
      if (!member.userId || !homeId) return;
      
      setIsFetching(true);
      try {
        const response = await homeApi.getMemberPermissions(homeId, member.userId);
        const permissions = response.data || [];
        setSelectedPermissions(new Set(permissions));
        lastMemberIdRef.current = member.userId;
      } catch (error) {
        console.error('Failed to fetch permissions:', error);
        toast.error('Không thể tải quyền của thành viên');
      } finally {
        setIsFetching(false);
      }
    }, [homeId, member.userId]);
  
    useEffect(() => {
      // Fetch permissions when modal opens and member changes
      if (open && member.userId && lastMemberIdRef.current !== member.userId) {
        fetchPermissions();
      }
    }, [open, member.userId, fetchPermissions]);
  
    const handlePermissionToggle = useCallback((permission: string) => {
      setSelectedPermissions((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(permission)) {
          newSet.delete(permission);
        } else {
          newSet.add(permission);
        }
        return newSet;
      });
    }, []);
  
    const handleSelectAll = useCallback((groupPermissions: string[]) => {
      setSelectedPermissions((prev) => {
        const allSelected = groupPermissions.every((perm) => prev.has(perm));
        const newSet = new Set(prev);
        if (allSelected) {
          groupPermissions.forEach((perm) => newSet.delete(perm));
        } else {
          groupPermissions.forEach((perm) => newSet.add(perm));
        }
        return newSet;
      });
    }, []);
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      try {
        const permissionsArray = Array.from(selectedPermissions);
        await homeApi.updateMemberPermissions(homeId, member.userId, permissionsArray);
        toast.success('Cập nhật quyền thành công');
        onClose();
        if (onSuccess) onSuccess();
      } catch (error: any) {
        toast.error(getUserFriendlyError(error));
      } finally {
        setIsLoading(false);
      }
    };
  
    const totalPermissions = Object.values(PERMISSION_GROUPS).flat().length;
    const selectedCount = selectedPermissions.size;

    const handleOpenChange = useCallback((newOpen: boolean) => {
      if (!newOpen) {
        onClose();
      }
    }, [onClose]);

    // Reset state when modal closes
    useEffect(() => {
      if (!open) {
        // Delay reset to allow Dialog animation to complete
        const timer = setTimeout(() => {
          setSelectedPermissions(new Set());
          setIsLoading(false);
          setIsFetching(false);
          lastMemberIdRef.current = null;
        }, 200);
        return () => clearTimeout(timer);
      }
    }, [open]);

    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {/* FIX 1: max-h-[90vh] và flex flex-col 
          Điều này đảm bảo Dialog không bao giờ cao hơn 90% màn hình 
          và nội dung bên trong sẽ sắp xếp theo cột.
        */}
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          
          {/* Header: shrink-0 để không bị co lại khi thiếu chỗ */}
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b bg-background z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div className="text-left">
                <DialogTitle className="text-xl">Quản lý phân quyền</DialogTitle>
                <DialogDescription className="mt-1">
                  Thành viên: <span className="font-semibold text-foreground">{member.username}</span>
                </DialogDescription>
              </div>
              <div className="ml-auto text-sm text-muted-foreground hidden sm:block">
                Đã chọn: <Badge variant="secondary" className="ml-1">{selectedCount}/{totalPermissions}</Badge>
              </div>
            </div>
          </DialogHeader>
  
          {isFetching ? (
            <div className="flex items-center justify-center py-12 flex-1">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            /* FIX 2: Cấu trúc Form Flex
              - flex-1: Chiếm toàn bộ khoảng trống còn lại giữa Header và Footer.
              - min-h-0: CỰC KỲ QUAN TRỌNG. Nó cho phép flex item thu nhỏ lại (xuất hiện scroll) 
                thay vì bị đẩy dài ra theo nội dung.
            */
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              
              {/* FIX 3: Thay ScrollArea bằng Native Scroll (overflow-y-auto)
                 Lý do: Component ScrollArea đôi khi gặp lỗi tính toán chiều cao trong Modal Flex.
                 Sử dụng div thường với overflow-y-auto là giải pháp an toàn và mượt mà nhất.
              */}
              <div className="flex-1 overflow-y-auto p-6 bg-muted/5">
                <div className="space-y-8">
                  {Object.entries(PERMISSION_GROUPS).map(([groupName, groupPermissions]) => {
                    const allSelected = groupPermissions.every((perm) => selectedPermissions.has(perm));
                    return (
                      <div key={groupName} className="space-y-3">
                        <div className="flex items-center justify-between sticky top-0 bg-background/0 backdrop-blur-sm z-10 py-2">
                          <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            {groupName}
                          </h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectAll(groupPermissions)}
                            className="h-7 text-xs hover:bg-primary/10 hover:text-primary"
                          >
                            {allSelected ? 'Bỏ chọn' : 'Chọn tất cả'}
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {groupPermissions.map((permission) => {
                                const isSelected = selectedPermissions.has(permission);
                                return (
                                <div
                                    key={permission}
                                    className={cn(
                                    "flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 select-none",
                                    "hover:border-primary/50 hover:bg-primary/5",
                                    isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-input bg-background"
                                    )}
                                >
                                    <Checkbox
                                    id={permission}
                                    checked={isSelected}
                                    onCheckedChange={() => handlePermissionToggle(permission)}
                                    className="mt-0.5" 
                                    />
                                    <label 
                                        htmlFor={permission}
                                        className="text-sm font-medium leading-none cursor-pointer flex-1"
                                    >
                                        {PERMISSION_LABELS[permission] || permission}
                                    </label>
                                </div>
                                );
                            })}
                            </div>
                      </div>
                    );
                  })}
                </div>
              </div>
  
              {/* Footer: shrink-0 để luôn nằm dưới đáy */}
              <DialogFooter className="flex-shrink-0 border-t p-4 bg-background z-10">
                <div className="flex w-full justify-between sm:justify-end gap-2">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                    Hủy bỏ
                  </Button>
                  <Button type="submit" disabled={isLoading} className="min-w-[140px]">
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Lưu thay đổi
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    );
  }