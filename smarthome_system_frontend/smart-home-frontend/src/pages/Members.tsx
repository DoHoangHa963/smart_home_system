import { useEffect, useState } from 'react';
import { usePermission } from '@/hooks/usePermission';
import { useHomeStore } from '@/store/homeStore';
import { HOME_PERMISSIONS } from '@/types/permission';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, MoreVertical, Crown, Shield, User, LogOut, ShieldAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import AddMemberModal from '@/components/members/AddMemberModal';
import UpdateRoleModal from '@/components/members/UpdateRoleModal';
import type { HomeMember } from '@/types/home';

export default function Members() {
  const { can, isOwner, homeRole, hasHomeAccess, currentHome } = usePermission();
  const { members, fetchHomeMembers, removeMember, isLoading } = useHomeStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<HomeMember | null>(null);

  const handleRemoveMember = async () => {
    if (!currentHome || !selectedMember) return;

    try {
      await removeMember(currentHome.id, selectedMember.userId);
      setShowRemoveDialog(false);
      setSelectedMember(null);
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  // Check permission
  if (!hasHomeAccess) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Alert className="max-w-md">
          <AlertDescription>Vui lòng chọn nhà trước</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!can(HOME_PERMISSIONS.MEMBER_VIEW)) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>Bạn không có quyền xem danh sách thành viên</AlertDescription>
        </Alert>
      </div>
    );
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="h-4 w-4" />;
      case 'ADMIN':
        return <Shield className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'default';
      case 'ADMIN':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoading && members.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Thành viên</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vai trò của bạn: <Badge variant="outline">{homeRole}</Badge>
          </p>
        </div>

        <PermissionGate permission={HOME_PERMISSIONS.MEMBER_INVITE}>
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Mời thành viên
          </Button>
        </PermissionGate>
      </div>

      {/* Members List */}
      <div className="space-y-3">
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={member.avatarUrl} />
                  <AvatarFallback>
                    {member.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{member.username}</p>
                    <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1">
                      {getRoleIcon(member.role)}
                      {member.role}
                    </Badge>
                    {member.status === 'PENDING' && (
                      <Badge variant="outline" className="text-yellow-600">
                        Đang chờ
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                  {member.joinedAt && (
                    <p className="text-xs text-muted-foreground">
                      Tham gia: {new Date(member.joinedAt).toLocaleDateString('vi-VN')}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions - Chỉ hiện nếu có quyền */}
              {member.role !== 'OWNER' && (isOwner || can(HOME_PERMISSIONS.MEMBER_UPDATE)) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {isOwner && (
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedMember(member);
                          setShowRoleModal(true);
                        }}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Đổi vai trò
                      </DropdownMenuItem>
                    )}

                    {(isOwner || can(HOME_PERMISSIONS.MEMBER_REMOVE)) && (
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          setSelectedMember(member);
                          setShowRemoveDialog(true);
                        }}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Xóa khỏi nhà
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Member Modal */}
      <AddMemberModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        homeId={currentHome?.id || 0}
      />

      {/* Update Role Modal */}
      {selectedMember && (
        <UpdateRoleModal
          open={showRoleModal}
          onClose={() => {
            setShowRoleModal(false);
            setSelectedMember(null);
          }}
          member={selectedMember}
          homeId={currentHome?.id || 0}
        />
      )}

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa thành viên</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa <strong>{selectedMember?.username}</strong> khỏi nhà?
              Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedMember(null)}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-red-600 hover:bg-red-700"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}