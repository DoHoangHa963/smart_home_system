// src/lib/api/admin.api.ts
import type { ApiResponse } from '@/types/api';
import api from '../api';
import type { User } from '@/types/user';
import type { PageableResponse } from '@/types/pageable';
import type { AdminDashboardResponse } from '@/types/admin';
import type { PaginatedResponse, DeviceResponse } from '@/types/device';

export const adminApi = {
  /**
   * GET /api/v1/users
   * Lấy danh sách người dùng với phân trang
   */
  getUsers: async (
    page = 0, 
    size = 20, 
    sortBy = 'createdAt', 
    sortDirection: 'ASC' | 'DESC' = 'DESC'
  ) => {
    return api.get<ApiResponse<PageableResponse<User>>>('/users', {
      params: { 
        page, 
        size, 
        sortBy, 
        sortDirection 
      }
    });
  },

  /**
   * GET /api/v1/users/search
   * Tìm kiếm người dùng
   */
  searchUsers: async (
    keyword: string, 
    page = 0, 
    size = 20,
    sortBy = 'createdAt',
    sortDirection: 'ASC' | 'DESC' = 'DESC'
  ) => {
    return api.get<ApiResponse<PageableResponse<User>>>('/users/search', {
      params: { 
        keyword, 
        page, 
        size,
        sortBy,
        sortDirection
      }
    });
  },

  /**
   * GET /api/v1/users/{userId}
   * Lấy thông tin chi tiết một người dùng
   */
  getUserById: async (userId: string) => {
    return api.get<ApiResponse<User>>(`/users/${userId}`);
  },

  getCurrentUser: async () => {
    return api.get<ApiResponse<User>>('/api/users/me');
  },

  /**
   * GET /api/v1/users/by-status/{status}
   * Lấy danh sách người dùng theo trạng thái
   */
  getUsersByStatus: async (status: 'ACTIVE' | 'INACTIVE' | 'BANNED') => {
    return api.get<ApiResponse<User[]>>(`/users/by-status/${status}`);
  },

  /**
   * PUT /api/v1/users/{userId}/status
   * Cập nhật trạng thái người dùng
   * Backend expects JSON string, not object
   */
  updateUserStatus: async (userId: string, status: string) => {
    return api.put<ApiResponse<User>>(
      `/users/${userId}/status`, 
      { status: status },
      {
        headers: { 
          'Content-Type': 'application/json'
        } 
      }
    );
  },

  /**
   * PUT /api/v1/users/{userId}
   * Cập nhật thông tin người dùng
   */
  updateUser: async (userId: string, data: {
    email?: string;
    phone?: string | null;
    password?: string;
    roleIds?: number[]; // Thêm roleIds vào đây
}) => {
return api.put<ApiResponse<User>>(`/users/${userId}`, data);
},

  /**
   * DELETE /api/v1/users/{userId}
   * Xóa người dùng vĩnh viễn
   */
  deleteUser: async (userId: string) => {
    return api.delete<ApiResponse<void>>(`/users/${userId}`);
  },

  /**
   * DELETE /api/v1/users/{userId}/soft
   * Xóa mềm người dùng
   */
  softDeleteUser: async (userId: string) => {
    return api.delete<ApiResponse<void>>(`/users/${userId}/soft`);
  },

  /**
   * PUT /api/v1/users/{userId}/restore
   * Khôi phục người dùng đã xóa mềm
   */
  restoreUser: async (userId: string) => {
    return api.put<ApiResponse<User>>(`/users/${userId}/restore`);
  },

  /**
   * GET /api/v1/users/{userId}/roles
   * Lấy danh sách vai trò của người dùng
   */
  getUserRoles: async (userId: string) => {
    return api.get<ApiResponse<string[]>>(`/users/${userId}/roles`);
  },

  /**
   * GET /api/v1/users/{userId}/permissions
   * Lấy danh sách quyền của người dùng
   */
  getUserPermissions: async (userId: string) => {
    return api.get<ApiResponse<string[]>>(`/users/${userId}/permissions`);
  },

  /**
   * POST /api/v1/users/{userId}/assign-roles
   * Gán vai trò cho người dùng
   */
  assignRolesToUser: async (userId: string, roleIds: number[]) => {
    return api.post<ApiResponse<User>>(`/users/${userId}/assign-roles`, roleIds);
  },

  /**
   * DELETE /api/v1/users/{userId}/remove-roles
   * Xóa vai trò khỏi người dùng
   */
  removeRolesFromUser: async (userId: string, roleIds: number[]) => {
    return api.delete<ApiResponse<User>>(`/users/${userId}/remove-roles`, {
      data: roleIds
    });
  },

  /**
   * GET /api/v1/users/check-email/{email}
   * Kiểm tra email đã tồn tại chưa
   */
  checkEmailExists: async (email: string) => {
    return api.get<ApiResponse<boolean>>(`/users/check-email/${email}`);
  },

  /**
   * GET /api/v1/users/check-username/{username}
   * Kiểm tra username đã tồn tại chưa
   */
  checkUsernameExists: async (username: string) => {
    return api.get<ApiResponse<boolean>>(`/users/check-username/${username}`);
  },

  /**
   * GET /api/v1/users/count/active
   * Đếm số người dùng đang hoạt động
   */
  getActiveUsersCount: async () => {
    return api.get<ApiResponse<number>>('/users/count/active');
  },

  /**
   * POST /api/v1/users/{userId}/upload-avatar
   * Upload avatar cho người dùng
   */
  uploadAvatar: async (userId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post<ApiResponse<User>>(`/users/${userId}/upload-avatar`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  /**
   * POST /api/v1/users
   * Tạo người dùng mới (Admin only)
   */
  createUser: async (userData: {
    username: string;
    email: string;
    password: string;
    phone?: string;
    roleIds?: number[];
  }) => {
    return api.post<ApiResponse<User>>('/users', userData);
  },

  /**
   * GET /api/v1/admin/dashboard/detail
   * Lấy toàn bộ dữ liệu thống kê cho Dashboard (Charts, Cards, Logs)
   */
  getDashboardDetail: async () => {
    // Lưu ý: Path phải khớp với @RequestMapping("/api/v1/admin") bên Backend
    return api.get<AdminDashboardResponse>('/admin/dashboard/detail');
  },

  /**
   * GET /api/v1/admin/devices
   * Lấy danh sách TOÀN BỘ thiết bị trong hệ thống (Global View)
   * Khác với lấy thiết bị theo Home, API này dành cho Admin quản lý
   */
  getAllDevicesGlobal: async (
    page = 0, 
    size = 20
  ) => {
    return api.get<ApiResponse<PaginatedResponse<DeviceResponse>>>('/admin/devices', {
      params: { 
        page, 
        size 
      }
    });
  }

};