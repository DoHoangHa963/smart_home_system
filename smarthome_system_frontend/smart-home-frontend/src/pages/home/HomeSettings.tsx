import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Home,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Trash2,
  LogOut,
  Users,
  Clock,
  MapPin,
  Building2,
  UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useHomeStore } from '@/store/homeStore';
import { usePermission } from '@/hooks/usePermission';
import { homeApi } from '@/lib/api/home.api';
import { getUserFriendlyError } from '@/utils/errorHandler';
import { TIME_ZONES, getTimeZoneByValue } from '@/constants/timeZones';
import { HOME_PERMISSIONS } from '@/types/permission';
import { useNavigate } from 'react-router-dom';

export default function HomeSettings() {
  const { currentHome, setCurrentHome } = useHomeStore();
  const { isOwner, can, isAdmin } = usePermission();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    timeZone: 'Asia/Ho_Chi_Minh',
  });

  // Dialog states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferOwnerId, setTransferOwnerId] = useState('');
  
  // Members for transfer ownership
  const [members, setMembers] = useState<any[]>([]);

  // Load home data
  useEffect(() => {
    if (currentHome) {
      setFormData({
        name: currentHome.name || '',
        address: currentHome.address || '',
        timeZone: currentHome.timeZone || 'Asia/Ho_Chi_Minh',
      });
      loadMembersForTransfer();
    }
  }, [currentHome]);

  const loadMembersForTransfer = async () => {
    if (!currentHome || !isOwner) return;
    
    try {
      const response = await homeApi.getHomeMembers(currentHome.id);
      const membersData = response.data || [];
      // Filter out current owner
      const otherMembers = membersData.filter(
        (m: any) => m.role !== 'OWNER' && m.status === 'ACTIVE'
      );
      setMembers(otherMembers);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };


  const canUpdateSettings = isOwner || isAdmin || can(HOME_PERMISSIONS.HOME_SETTINGS_UPDATE);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTimeZoneChange = (value: string) => {
    setFormData((prev) => ({ ...prev, timeZone: value }));
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentHome) {
      toast.error('Không tìm thấy thông tin nhà');
      return;
    }

    if (!canUpdateSettings) {
      toast.error('Bạn không có quyền cập nhật cài đặt nhà');
      return;
    }

    setIsLoading(true);
    try {
      const updatedHome = await homeApi.updateHome(currentHome.id, {
        name: formData.name.trim(),
        address: formData.address.trim() || undefined,
        timeZone: formData.timeZone,
      });
      
      await setCurrentHome(updatedHome.data);
      toast.success('Cập nhật cài đặt nhà thành công');
    } catch (error: any) {
      console.error('Failed to update settings:', error);
      toast.error(getUserFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteHome = async () => {
    if (!currentHome) return;

    setIsLoading(true);
    try {
      await homeApi.deleteHome(currentHome.id);
      toast.success('Đã xóa nhà thành công');
      setCurrentHome(null);
      navigate('/select-home');
    } catch (error: any) {
      console.error('Failed to delete home:', error);
      toast.error(getUserFriendlyError(error));
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleLeaveHome = async () => {
    if (!currentHome) return;

    setIsLoading(true);
    try {
      await homeApi.leaveHome(currentHome.id);
      toast.success('Đã rời khỏi nhà thành công');
      setCurrentHome(null);
      navigate('/select-home');
    } catch (error: any) {
      console.error('Failed to leave home:', error);
      toast.error(getUserFriendlyError(error));
    } finally {
      setIsLoading(false);
      setShowLeaveDialog(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!currentHome || !transferOwnerId) return;

    setIsLoading(true);
    try {
      await homeApi.transferOwnership(currentHome.id, transferOwnerId);
      toast.success('Chuyển quyền sở hữu thành công');
      setShowTransferDialog(false);
      setTransferOwnerId('');
      // Reload home data
      if (currentHome) {
        const updatedHome = await homeApi.getHomeById(currentHome.id);
        await setCurrentHome(updatedHome.data);
      }
      loadMembersForTransfer();
    } catch (error: any) {
      console.error('Failed to transfer ownership:', error);
      toast.error(getUserFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentHome) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Vui lòng chọn một nhà để xem cài đặt</p>
        </div>
      </div>
    );
  }

  const getCurrentTimeZoneLabel = () => {
    const tz = getTimeZoneByValue(formData.timeZone);
    return tz ? tz.label : formData.timeZone;
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-primary/10">
          <Settings className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Cài đặt nhà</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý cấu hình và thông tin của <strong>{currentHome.name}</strong>
          </p>
        </div>
        <Badge variant={isOwner ? 'default' : 'secondary'} className="flex items-center gap-2">
          {isOwner ? (
            <>
              <UserCheck className="h-4 w-4" />
              Chủ nhà
            </>
          ) : (
            <>
              <Users className="h-4 w-4" />
              Thành viên
            </>
          )}
        </Badge>
      </div>

      {/* Permission Alert */}
      {!canUpdateSettings && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-semibold text-yellow-900 dark:text-yellow-200">
                  Bạn không có quyền cập nhật cài đặt nhà
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Chỉ chủ nhà và quản trị viên mới có thể thay đổi cài đặt nhà.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Thông tin chung
          </CardTitle>
          <CardDescription>
            Cập nhật tên nhà, địa chỉ và múi giờ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateSettings} className="space-y-6">
            {/* Home Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Tên nhà <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Nhập tên nhà"
                required
                disabled={!canUpdateSettings}
                maxLength={50}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Từ 3-50 ký tự, chỉ chứa chữ cái, số và dấu cách
                </p>
                <span className="text-xs text-muted-foreground">
                  {formData.name.length}/50
                </span>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Địa chỉ
              </Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Nhập địa chỉ chi tiết"
                rows={3}
                disabled={!canUpdateSettings}
                maxLength={200}
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  Địa chỉ chi tiết giúp xác định vị trí nhà
                </p>
                <span className="text-xs text-muted-foreground">
                  {formData.address.length}/200
                </span>
              </div>
            </div>

            {/* Timezone */}
            <div className="space-y-2">
              <Label htmlFor="timeZone" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Múi giờ <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.timeZone}
                onValueChange={handleTimeZoneChange}
                disabled={!canUpdateSettings}
              >
                <SelectTrigger id="timeZone">
                  <SelectValue>{getCurrentTimeZoneLabel()}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIME_ZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Múi giờ hiện tại: {getCurrentTimeZoneLabel()}
              </p>
            </div>

            <Separator />

            {/* Submit Button */}
            {canUpdateSettings && (
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (currentHome) {
                      setFormData({
                        name: currentHome.name || '',
                        address: currentHome.address || '',
                        timeZone: currentHome.timeZone || 'Asia/Ho_Chi_Minh',
                      });
                    }
                  }}
                  disabled={isLoading}
                >
                  <X className="mr-2 h-4 w-4" />
                  Hủy
                </Button>
                <Button type="submit" disabled={isLoading}>
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
            )}
          </form>
        </CardContent>
      </Card>

      {/* Transfer Ownership (Owner only) */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Chuyển quyền sở hữu
            </CardTitle>
            <CardDescription>
              Chuyển quyền sở hữu nhà cho một thành viên khác. Bạn sẽ mất quyền chủ nhà sau khi chuyển.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members.length === 0 ? (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Không có thành viên nào khác để chuyển quyền sở hữu.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Chọn thành viên để chuyển quyền</Label>
                    <Select value={transferOwnerId} onValueChange={setTransferOwnerId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn thành viên..." />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.userId} value={member.userId}>
                            {member.username} ({member.email}) - {member.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowTransferDialog(true)}
                    disabled={!transferOwnerId || isLoading}
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    Chuyển quyền sở hữu
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="border-none dark:border-none space-y-4">
          {/* Leave Home (Members only) */}
          {!isOwner && (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Rời khỏi nhà</h4>
                <p className="text-sm text-muted-foreground">
                  Rời khỏi nhà này. Bạn sẽ mất quyền truy cập sau khi rời.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowLeaveDialog(true)}
                disabled={isLoading}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Rời khỏi nhà
              </Button>
            </div>
          )}

          {/* Delete Home (Owner only) */}
          {isOwner && (
            <div className="flex items-center justify-between p-4 border rounded-lg border-red-200 dark:border-red-900">
              <div className="flex-1">
                <h4 className="font-semibold mb-1 text-red-600 dark:text-red-400">
                  Xóa nhà
                </h4>
                <p className="text-sm text-muted-foreground">
                  Xóa vĩnh viễn nhà này và tất cả dữ liệu liên quan. Hành động này không thể hoàn tác.
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isLoading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa nhà
              </Button>
            </div>
          )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Xác nhận xóa nhà
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Bạn có chắc chắn muốn xóa nhà <strong>"{currentHome?.name}"</strong>?
              </p>
              <p className="text-red-600 font-semibold">
                Hành động này sẽ xóa vĩnh viễn:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm ml-4">
                <li>Tất cả thiết bị và cấu hình</li>
                <li>Tất cả phòng và tự động hóa</li>
                <li>Tất cả thành viên và quyền hạn</li>
                <li>Tất cả dữ liệu và lịch sử</li>
              </ul>
              <p className="text-red-600 font-semibold mt-4">
                Hành động này không thể hoàn tác!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteHome}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xóa...
                </>
              ) : (
                'Xóa nhà'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Home Confirmation Dialog */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Xác nhận rời khỏi nhà
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Bạn có chắc chắn muốn rời khỏi nhà <strong>"{currentHome?.name}"</strong>?
              </p>
              <p>
                Sau khi rời khỏi, bạn sẽ mất tất cả quyền truy cập vào nhà này và cần được mời lại để tham gia.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveHome}
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Rời khỏi nhà'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Ownership Confirmation Dialog */}
      <AlertDialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Xác nhận chuyển quyền sở hữu
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Bạn có chắc chắn muốn chuyển quyền sở hữu nhà <strong>"{currentHome?.name}"</strong> cho thành viên khác?
              </p>
              {transferOwnerId && (
                <p>
                  Thành viên được chọn: <strong>
                    {members.find((m) => m.userId === transferOwnerId)?.username}
                  </strong>
                </p>
              )}
              <p className="text-orange-600 font-semibold mt-4">
                Sau khi chuyển, bạn sẽ mất quyền chủ nhà và trở thành thành viên thường.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransferOwnership}
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang chuyển...
                </>
              ) : (
                'Xác nhận chuyển'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
