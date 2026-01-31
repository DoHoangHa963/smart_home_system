// hooks/usePermission.ts
import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useHomeStore } from '@/store/homeStore';
import {
  SystemRole,
  HomeRole,
  hasPermission,
  hasAnyPermission,
  hasHomeRole,
  isSystemAdmin,
  getHomeRolePermissions,
  parsePermissions,
  type Permission,
  type SystemPermission,
  type HomePermission,
  HOME_PERMISSIONS, // Đảm bảo bạn import enum này để map quyền cứng
} from '@/types/permission';

export const usePermission = () => {
  const { user } = useAuthStore();
  const { currentHome, currentMember } = useHomeStore();

  // ============================================
  // SYSTEM ROLE CHECK
  // ============================================
  const isAdmin = useMemo(() => {
    return user?.roles ? isSystemAdmin(user.roles) : false;
  }, [user?.roles]);

  const isUser = useMemo(() => {
    return user?.roles?.includes(SystemRole.USER) || false;
  }, [user?.roles]);

  // ============================================
  // HOME ROLE & PERMISSIONS
  // ============================================
  const homeRole = useMemo(() => {
    return currentMember?.role as HomeRole | undefined;
  }, [currentMember?.role]);

  const homePermissions = useMemo<HomePermission[]>(() => {
    if (!homeRole) return [];

    // 1. Lấy quyền tùy chỉnh từ DB (JSON)
    const customPermissions = parsePermissions(currentMember?.permissions);

    // 2. Lấy quyền mặc định theo Role (định nghĩa trong frontend/types/permission.ts)
    // Đây là chốt chặn quan trọng: ADMIN phải luôn có quyền mặc định kể cả khi DB rỗng
    const rolePermissions = getHomeRolePermissions(homeRole);

    // 3. Merge và loại bỏ trùng lặp
    return Array.from(new Set([...rolePermissions, ...customPermissions])) as HomePermission[];
  }, [homeRole, currentMember?.permissions]);

  // ============================================
  // PERMISSION CHECKERS (LOGIC QUAN TRỌNG ĐÃ SỬA)
  // ============================================

  /**
   * Check if user has system or home permission(s)
   */
  const can = (permission: Permission | Permission[]): boolean => {
    // 1. System Admin luôn có quyền (God mode hệ thống)
    if (isAdmin) {
      return true;
    }

    // 2. Home Owner luôn có quyền (God mode trong nhà)
    // Sửa lỗi triệt để: Không cần check list permission nếu là Owner
    if (homeRole === HomeRole.OWNER) {
      return true;
    }

    // 3. Home Admin xử lý đặc biệt (Tùy chọn)
    // Nếu bạn muốn Admin luôn xem được thành viên mà không cần check list
    // (Bỏ qua đoạn này nếu bạn muốn Admin bị giới hạn chặt chẽ theo list)
    if (homeRole === HomeRole.ADMIN) {
        // Ví dụ: Admin luôn có quyền VIEW cơ bản
        if (permission === HOME_PERMISSIONS.MEMBER_VIEW || 
            permission === HOME_PERMISSIONS.DEVICE_VIEW) {
            return true;
        }
    }

    // 4. Kiểm tra danh sách permission cụ thể
    return hasPermission(homePermissions, permission);
  };

  /**
   * Check if user has ANY of the permissions
   */
  const canAny = (permissions: Permission[]): boolean => {
    if (isAdmin) return true;
    if (homeRole === HomeRole.OWNER) return true; // Owner bypass

    return hasAnyPermission(homePermissions, permissions);
  };

  /**
   * Check if user has specific home role or higher
   */
  const hasRole = (requiredRole: HomeRole): boolean => {
    if (!homeRole) return false;
    return hasHomeRole(homeRole, requiredRole);
  };

  // ============================================
  // ROLE SHORTCUTS
  // ============================================

  const isOwner = useMemo(() => homeRole === HomeRole.OWNER, [homeRole]);
  const isHomeAdmin = useMemo(() => homeRole === HomeRole.ADMIN, [homeRole]);
  const isMember = useMemo(() => homeRole === HomeRole.MEMBER, [homeRole]);
  const isGuest = useMemo(() => homeRole === HomeRole.GUEST, [homeRole]);

  const isOwnerOrAdmin = useMemo(
    () => isOwner || isHomeAdmin,
    [isOwner, isHomeAdmin]
  );

  const hasHomeAccess = useMemo(() => !!currentMember, [currentMember]);

  // ============================================
  // RETURN OBJECT
  // ============================================
  return {
    // System roles
    isAdmin,
    isUser,

    // Home roles
    homeRole,
    isOwner,
    isHomeAdmin,
    isMember,
    isGuest,
    isOwnerOrAdmin,
    hasHomeAccess,

    // Permission checkers
    can,
    canAny,
    hasRole,

    // Raw data
    homePermissions,
    currentMember,
    currentHome,
  };
};