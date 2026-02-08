import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Loader2, User, Lock, Mail, Phone, Camera, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { authApi, type UpdateProfileRequest, type ChangePasswordRequest } from '@/lib/api/auth.api';
import { getUserFriendlyError } from '@/utils/errorHandler';
import { cn } from '@/lib/utils';

export default function Account() {
  const { user, updateUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Profile form state
  const [profileForm, setProfileForm] = useState<UpdateProfileRequest>({
    email: '',
    phone: '',
    avatarUrl: '',
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState<ChangePasswordRequest>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswordFields, setShowPasswordFields] = useState(false);

  // Load user data
  useEffect(() => {
    if (user) {
      setProfileForm({
        email: user.email || '',
        phone: user.phone || '',
        avatarUrl: user.avatarUrl || '',
      });
    } else {
      fetchUserData();
    }
  }, [user]);

  // Handle hash navigation
  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#security') {
      setActiveTab('security');
    } else {
      setActiveTab('profile');
    }
  }, []);

  const fetchUserData = async () => {
    setIsFetching(true);
    try {
      const userData = await authApi.getCurrentUser();
      setProfileForm({
        email: userData.email || '',
        phone: userData.phone || '',
        avatarUrl: userData.avatarUrl || '',
      });
      // Update auth store
      updateUser(userData);
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      toast.error('Không thể tải thông tin tài khoản');
    } finally {
      setIsFetching(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updatedUser = await authApi.updateProfile(profileForm);
      toast.success('Cập nhật thông tin thành công');
      
      // Update auth store
      updateUser(updatedUser);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      toast.error(getUserFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Mật khẩu mới và xác nhận mật khẩu không khớp');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setIsLoading(true);

    try {
      await authApi.changePassword(passwordForm);
      toast.success('Đổi mật khẩu thành công');
      
      // Reset form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setShowPasswordFields(false);
    } catch (error: any) {
      console.error('Failed to change password:', error);
      toast.error(getUserFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = () => {
    if (user?.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  if (isFetching) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-lg bg-primary/10">
          <User className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Cài đặt tài khoản</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý thông tin cá nhân và bảo mật tài khoản
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Thông tin cá nhân
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Bảo mật
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cá nhân</CardTitle>
              <CardDescription>
                Cập nhật thông tin cá nhân của bạn. Email và số điện thoại sẽ được sử dụng để liên hệ.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-6 pb-6 border-b">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profileForm.avatarUrl} alt={user?.username} />
                    <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Label className="text-base font-semibold mb-2 block">Ảnh đại diện</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      URL ảnh đại diện của bạn
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="url"
                        placeholder="https://example.com/avatar.jpg"
                        value={profileForm.avatarUrl || ''}
                        onChange={(e) =>
                          setProfileForm((prev) => ({ ...prev, avatarUrl: e.target.value }))
                        }
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Username (Read-only) */}
                <div className="space-y-2">
                  <Label htmlFor="username">Tên đăng nhập</Label>
                  <Input
                    id="username"
                    value={user?.username || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tên đăng nhập không thể thay đổi
                  </p>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={profileForm.email || ''}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Email sẽ được sử dụng để đăng nhập và nhận thông báo
                  </p>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Số điện thoại
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0123456789"
                    value={profileForm.phone || ''}
                    onChange={(e) =>
                      setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    pattern="[0-9]{10,15}"
                  />
                  <p className="text-xs text-muted-foreground">
                    Số điện thoại từ 10-15 chữ số (tùy chọn)
                  </p>
                </div>

                <Separator />

                {/* Submit Button */}
                <div className="flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (user) {
                        setProfileForm({
                          email: user.email || '',
                          phone: user.phone || '',
                          avatarUrl: user.avatarUrl || '',
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
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Đổi mật khẩu</CardTitle>
              <CardDescription>
                Thay đổi mật khẩu của bạn để bảo vệ tài khoản. Mật khẩu mới phải có ít nhất 6 ký tự,
                bao gồm chữ hoa, chữ thường và số.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showPasswordFields ? (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-4">
                      Nhấn nút bên dưới để bắt đầu đổi mật khẩu
                    </p>
                    <Button
                      type="button"
                      onClick={() => setShowPasswordFields(true)}
                      variant="default"
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Đổi mật khẩu
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  {/* Current Password */}
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      placeholder="Nhập mật khẩu hiện tại"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Mật khẩu mới</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Nhập mật khẩu mới"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      required
                      minLength={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường và số
                    </p>
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Nhập lại mật khẩu mới"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      required
                      minLength={6}
                    />
                  </div>

                  <Separator />

                  {/* Submit Buttons */}
                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPasswordFields(false);
                        setPasswordForm({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: '',
                        });
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
                          Đang đổi...
                        </>
                      ) : (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Đổi mật khẩu
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
