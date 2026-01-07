// src/pages/system/SystemUsers.tsx
import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api/admin.api';
import type { User } from '@/types/user';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  MoreHorizontal, 
  Shield, 
  Ban, 
  CheckCircle, 
  Trash2, 
  Loader2,
  UserX,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  AlertCircle,
  Edit,
  Eye // Thêm icon xem chi tiết
} from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';

// --- CONFIG ---
const ROLE_ADMIN_ID = 1;
const ROLE_USER_ID = 2;

// --- VALIDATION LOGIC (Ported from UsernameValidator.java) ---
const FORBIDDEN_USERNAMES = [
  "admin", "administrator", "system", "root", "user", "test",
  "null", "undefined", "guest", "anonymous", "support",
  "moderator", "owner", "superuser", "api", "server"
];

const validateUsername = (username: string): string | null => {
  if (!username || username.trim() === '') {
    return "Username không được để trống";
  }

  if (username.length < 3) {
    return "Username phải có ít nhất 3 ký tự";
  }

  if (username.length > 50) {
    return "Username không được vượt quá 50 ký tự";
  }

  if (username.includes(" ")) {
    return "Username không được chứa khoảng trắng";
  }

  if (!/^[a-zA-Z]/.test(username)) {
    return "Username phải bắt đầu bằng chữ cái";
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return "Username chỉ được chứa chữ cái, số và gạch dưới (_)";
  }

  if (username.endsWith("_")) {
    return "Username không được kết thúc bằng gạch dưới";
  }

  if (username.includes("__")) {
    return "Username không được có 2 gạch dưới liên tiếp";
  }

  if (/^[0-9_]+$/.test(username)) {
    return "Username không được chỉ toàn số và gạch dưới";
  }

  const lowercaseUsername = username.toLowerCase();
  if (FORBIDDEN_USERNAMES.includes(lowercaseUsername)) {
    return "Username này không được phép sử dụng";
  }

  return null;
};

export default function SystemUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination State
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');
  
  // Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    id: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    isAdmin: false 
  });

  // Error State cho Form
  const [formErrors, setFormErrors] = useState<Record<string, string | null>>({
    username: null,
    email: null,
    password: null
  });

  const debouncedSearch = useDebounce(searchTerm, 500);

  // Fetch Users Function
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let response;
      if (debouncedSearch.trim()) {
        response = await adminApi.searchUsers(
          debouncedSearch, 
          page, 
          pageSize,
          sortBy,
          sortDirection
        );
      } else {
        response = await adminApi.getUsers(page, pageSize, sortBy, sortDirection);
      }

      const pageData = response.data.data;
      
      // Sắp xếp: Admin lên đầu
      const sortedUsers = [...pageData.content].sort((a, b) => {
        const aIsAdmin = a.roles.includes('ADMIN');
        const bIsAdmin = b.roles.includes('ADMIN');
        if (aIsAdmin && !bIsAdmin) return -1;
        if (!aIsAdmin && bIsAdmin) return 1;
        return 0;
      });
      
      setUsers(sortedUsers);
      setTotalPages(pageData.totalPages);
      setTotalElements(pageData.totalElements);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Không thể tải danh sách người dùng');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, pageSize, debouncedSearch, sortBy, sortDirection]);

  // Handle Create User
  const handleCreateUser = async () => {
    // 1. Reset Errors
    setFormErrors({ username: null, email: null, password: null });

    // 2. Validate
    let hasError = false;
    const newErrors: Record<string, string | null> = {};

    // Validate Username
    const usernameError = validateUsername(formData.username);
    if (usernameError) {
      newErrors.username = usernameError;
      hasError = true;
    }

    // Validate Email
    if (!formData.email || !formData.email.includes('@')) {
      newErrors.email = "Email không hợp lệ";
      hasError = true;
    }

    // Validate Password
    if (!formData.password || formData.password.length < 6) {
      newErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
      hasError = true;
    }

    if (hasError) {
      setFormErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }

    // 3. Call API
    setIsCreating(true);
    try {
      const roleIds = [ROLE_USER_ID];
      if (formData.isAdmin) {
        roleIds.push(ROLE_ADMIN_ID);
      }

      await adminApi.createUser({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        roleIds: roleIds
      });

      toast.success("Tạo người dùng mới thành công");
      setIsCreateOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Tạo người dùng thất bại");
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Edit User
const handleEditUser = async () => {
    if (!formData.id) return;

    // 1. Reset Errors
    setFormErrors({ username: null, email: null, password: null });

    // 2. Validate (Chỉ validate email, bỏ validate password)
    let hasError = false;
    const newErrors: Record<string, string | null> = {};

    if (!formData.email || !formData.email.includes('@')) {
      newErrors.email = "Email không hợp lệ";
      hasError = true;
    }

    if (hasError) {
      setFormErrors(prev => ({ ...prev, ...newErrors }));
      return;
    }

    // 3. Prepare update data
    setIsUpdating(true);
    try {
      // Logic xử lý Roles: Mặc định luôn có ROLE_USER (ID=2), nếu là Admin thì thêm ROLE_ADMIN (ID=1)
      const roleIds = [ROLE_USER_ID]; 
      if (formData.isAdmin) {
        roleIds.push(ROLE_ADMIN_ID);
      }

      const updateData: any = {
        email: formData.email,
        phone: formData.phone || null,
        roleIds: roleIds // Backend sẽ set lại toàn bộ role theo list này
      };

      // Gọi API update (lưu ý: đã bỏ trường password khỏi payload)
      await adminApi.updateUser(formData.id, updateData);

      toast.success("Cập nhật thông tin và quyền hạn thành công");
      setIsEditOpen(false);
      resetForm();
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setIsUpdating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      username: '',
      email: '',
      password: '',
      phone: '',
      isAdmin: false
    });
    setFormErrors({ username: null, email: null, password: null });
  };

  // Open Edit Modal với thông tin người dùng
  const openEditModal = (user: User) => {
    setFormData({
      id: user.id,
      username: user.username,
      email: user.email,
      password: '', // Để trống, chỉ fill khi muốn đổi mật khẩu
      phone: user.phone || '',
      isAdmin: user.roles.includes('ADMIN')
    });
    setFormErrors({ username: null, email: null, password: null });
    setIsEditOpen(true);
  };

  // Hàm handle input change chung
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Xóa lỗi của field đó khi user sửa
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      await adminApi.updateUserStatus(userId, newStatus);
      toast.success(`Đã cập nhật trạng thái thành ${getStatusLabel(newStatus)}`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Cập nhật thất bại');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
    try {
      await adminApi.softDeleteUser(userId);
      toast.success('Đã xóa người dùng');
      if (users.length === 1 && page > 0) {
        setPage(page - 1);
      } else {
        fetchUsers();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Xóa thất bại');
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(0);
  };

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setPage(0);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'ACTIVE': 'Hoạt động',
      'INACTIVE': 'Chưa kích hoạt',
      'BANNED': 'Đã khóa'
    };
    return labels[status] || status;
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return <Badge className="bg-green-600 hover:bg-green-700">ACTIVE</Badge>;
      case 'INACTIVE': return <Badge variant="secondary">INACTIVE</Badge>;
      case 'BANNED': return <Badge variant="destructive">BANNED</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderRoleBadges = (roles: string[]) => {
    return roles.map((role, idx) => {
      if (role === 'ADMIN') {
        return <Badge key={`${role}-${idx}`} variant="default" className="flex gap-1 items-center"><Shield className="h-3 w-3" /> Admin</Badge>;
      }
      return <Badge key={`${role}-${idx}`} variant="outline">User</Badge>;
    });
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      });
    } catch { return dateString; }
  };

  // Thêm logic mở modal chi tiết người dùng
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleViewUserDetails = (user: User) => {
    setSelectedUser(user); // Lưu thông tin người dùng được chọn
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý người dùng</h1>
          <p className="text-muted-foreground mt-1">
            Tổng số: <span className="font-semibold">{totalElements}</span> người dùng
          </p>
        </div>
        
        <div className="flex gap-2">
          {/* Dialog Tạo mới */}
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Thêm mới
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Tạo người dùng mới</DialogTitle>
                <DialogDescription>
                  Nhập thông tin chi tiết. Username phải tuân thủ quy tắc hệ thống.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                {/* USERNAME FIELD */}
                <div className="grid gap-2">
                  <Label htmlFor="username" className={formErrors.username ? "text-red-500" : ""}>
                    Tên đăng nhập <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => handleInputChange('username', e.target.value)}
                    placeholder="VD: nguyenvan_a"
                    className={formErrors.username ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {formErrors.username && (
                    <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{formErrors.username}</span>
                    </div>
                  )}
                </div>

                {/* EMAIL FIELD */}
                <div className="grid gap-2">
                  <Label htmlFor="email" className={formErrors.email ? "text-red-500" : ""}>
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@example.com"
                    className={formErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {formErrors.email && (
                    <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{formErrors.email}</span>
                    </div>
                  )}
                </div>

                {/* PASSWORD FIELD */}
                <div className="grid gap-2">
                  <Label htmlFor="password" className={formErrors.password ? "text-red-500" : ""}>
                    Mật khẩu <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="••••••••"
                    className={formErrors.password ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {formErrors.password && (
                    <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{formErrors.password}</span>
                    </div>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">Số điện thoại</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="0912..."
                  />
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    id="isAdmin" 
                    checked={formData.isAdmin}
                    onCheckedChange={(checked) => handleInputChange('isAdmin', checked)}
                  />
                  <Label htmlFor="isAdmin" className="text-sm font-medium leading-none cursor-pointer">
                    Cấp quyền Quản trị viên (Admin)
                  </Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Hủy</Button>
                <Button onClick={handleCreateUser} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Lưu người dùng
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog Chỉnh sửa */}
          <Dialog open={isEditOpen} onOpenChange={(open) => {
            setIsEditOpen(open);
            if (!open) resetForm();
          }}>
            <DialogContent className="sm:max-w-[500px]"> {/* Tăng chiều rộng một chút */}
              <DialogHeader>
                <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
                <DialogDescription>
                  Cập nhật thông tin và phân quyền cho: <span className="font-semibold text-primary">{formData.username}</span>
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                {/* --- CỘT 1: THÔNG TIN CƠ BẢN --- */}
                <div className="grid grid-cols-2 gap-4">
                    {/* USERNAME (Read-only) */}
                    <div className="grid gap-2">
                      <Label htmlFor="edit-username">Tên đăng nhập</Label>
                      <Input
                        id="edit-username"
                        value={formData.username}
                        disabled
                        className="bg-muted cursor-not-allowed"
                      />
                    </div>

                    {/* PHONE */}
                    <div className="grid gap-2">
                      <Label htmlFor="edit-phone">Số điện thoại</Label>
                      <Input
                        id="edit-phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                      />
                    </div>
                </div>

                {/* EMAIL */}
                <div className="grid gap-2">
                  <Label htmlFor="edit-email" className={formErrors.email ? "text-red-500" : ""}>
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@example.com"
                    className={formErrors.email ? "border-red-500 focus-visible:ring-red-500" : ""}
                  />
                  {formErrors.email && (
                    <div className="flex items-center gap-1 text-xs text-red-500 mt-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>{formErrors.email}</span>
                    </div>
                  )}
                </div>

                {/* --- CỘT 2: PHÂN QUYỀN (ROLES) --- */}
                <div className="grid gap-3 pt-2">
                  <Label className="text-base font-semibold">Phân quyền hệ thống</Label>
                  <div className="flex flex-col gap-3 border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
                      
                      {/* Role USER (Mặc định) */}
                      <div className="flex flex-row items-start space-x-3 space-y-0">
                        <Checkbox checked disabled />
                        <div className="space-y-1 leading-none">
                          <Label className="cursor-not-allowed opacity-70">
                            Người dùng cơ bản (User)
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Quyền mặc định của mọi tài khoản trong hệ thống.
                          </p>
                        </div>
                      </div>

                      <div className="h-[1px] bg-slate-200 dark:bg-slate-700" />

                      {/* Role ADMIN (Có thể toggle) */}
                      <div className="flex flex-row items-start space-x-3 space-y-0">
                        <Checkbox 
                          id="edit-isAdmin" 
                          checked={formData.isAdmin}
                          onCheckedChange={(checked) => handleInputChange('isAdmin', checked)}
                        />
                        <div className="space-y-1 leading-none">
                          <Label htmlFor="edit-isAdmin" className="cursor-pointer font-medium text-primary">
                            Quản trị viên (Admin)
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Có toàn quyền quản lý người dùng, hệ thống và cấu hình.
                          </p>
                        </div>
                      </div>

                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Hủy</Button>
                <Button onClick={handleEditUser} disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Lưu thay đổi
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button onClick={fetchUsers} variant="outline" size="icon" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm theo tên, email..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sắp xếp theo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Ngày tạo</SelectItem>
            <SelectItem value="updatedAt">Ngày cập nhật</SelectItem>
            <SelectItem value="username">Tên người dùng</SelectItem>
            <SelectItem value="email">Email</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortDirection} onValueChange={(v) => setSortDirection(v as 'ASC' | 'DESC')}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DESC">Mới nhất</SelectItem>
            <SelectItem value="ASC">Cũ nhất</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-background overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px] font-bold">Người dùng</TableHead>
              <TableHead className="font-bold">Vai trò</TableHead>
              <TableHead className="font-bold">Trạng thái</TableHead>
              <TableHead className="font-bold">Ngày tham gia</TableHead>
              <TableHead className="font-bold">Cập nhật</TableHead>
              <TableHead className="text-right w-[120px]">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col justify-center items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="text-muted-foreground">Đang tải dữ liệu...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <UserX className="h-12 w-12 opacity-50" />
                    <p>Không tìm thấy người dùng nào</p>
                    {searchTerm && (
                      <Button variant="link" size="sm" onClick={() => handleSearchChange('')}>
                        Xóa bộ lọc
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatarUrl} alt={user.username} />
                        <AvatarFallback>{user.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.username}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                        {user.phone && <span className="text-xs text-muted-foreground">{user.phone}</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">{renderRoleBadges(user.roles)}</div>
                  </TableCell>
                  <TableCell>{renderStatusBadge(user.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(user.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {/* Nút Sửa */}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => openEditModal(user)}
                        className="h-8 w-8"
                        title="Chỉnh sửa"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      {/* Nút Xem Chi tiết */}
                      <button
                        onClick={() => handleViewUserDetails(user)}
                        className="text-blue-600 hover:underline"
                        title="Xem chi tiết"
                      >
                        <Eye className="h-4 w-4 text-black" />
                      </button>

                      {/* Dropdown Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[200px]">
                          <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                            Sao chép ID
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.email)}>
                            Sao chép Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status === 'ACTIVE' && (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'INACTIVE')} className="text-yellow-600">
                                <UserX className="mr-2 h-4 w-4" /> Vô hiệu hóa
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'BANNED')} className="text-red-600">
                                <Ban className="mr-2 h-4 w-4" /> Khóa tài khoản
                              </DropdownMenuItem>
                            </>
                          )}
                          {(user.status === 'INACTIVE' || user.status === 'BANNED') && (
                            <DropdownMenuItem onClick={() => handleStatusChange(user.id, 'ACTIVE')} className="text-green-600">
                              <CheckCircle className="mr-2 h-4 w-4" /> Kích hoạt / Mở khóa
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteUser(user.id)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                            <Trash2 className="mr-2 h-4 w-4" /> Xóa người dùng
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Trang <span className="font-medium">{page + 1}</span> / <span className="font-medium">{totalPages || 1}</span>
            {' '}· Tổng <span className="font-medium">{totalElements}</span> người dùng
          </div>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-auto"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 / trang</SelectItem>
              <SelectItem value="10">10 / trang</SelectItem>
              <SelectItem value="20">20 / trang</SelectItem>
              <SelectItem value="50">50 / trang</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={page === 0 || isLoading}>Đầu</Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || isLoading}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1 || isLoading}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1 || isLoading}>Cuối</Button>
        </div>
      </div>

      {/* Modal hiển thị chi tiết người dùng */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Eye className="h-6 w-6 text-primary" />
              Chi tiết Người dùng
            </DialogTitle>
            <DialogDescription>
              Thông tin đầy đủ về người dùng <span className="font-semibold text-foreground">{selectedUser?.username}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="grid gap-2 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-medium">Tên đăng nhập:</span>
                  <span className="text-muted-foreground">{selectedUser.username}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium">Email:</span>
                  <span className="text-muted-foreground">{selectedUser.email}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium">Số điện thoại:</span>
                  <span className="text-muted-foreground">{selectedUser.phone || 'N/A'}</span>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium">Trạng thái:</span>
                  <span className="text-muted-foreground">{getStatusLabel(selectedUser.status)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-sm font-medium">Vai trò:</span>
                <div className="flex gap-2">
                  {selectedUser.roles.map((role, idx) => (
                    <Badge key={idx} variant="outline">{role}</Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-sm font-medium">Ngày tham gia:</span>
                <span className="text-muted-foreground">{formatDate(selectedUser.createdAt)}</span>
              </div>

              <div className="space-y-1">
                <span className="text-sm font-medium">Ngày cập nhật:</span>
                <span className="text-muted-foreground">{formatDate(selectedUser.updatedAt)}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}