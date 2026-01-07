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

    // Parse custom permissions from JSON
    const customPermissions = parsePermissions(currentMember?.permissions);

    // Get default role permissions
    const rolePermissions = getHomeRolePermissions(homeRole);

    // Merge and deduplicate
    return Array.from(new Set([...rolePermissions, ...customPermissions])) as HomePermission[];
  }, [homeRole, currentMember?.permissions]);

  // ============================================
  // PERMISSION CHECKERS
  // ============================================

  /**
   * Check if user has system or home permission(s)
   */
  const can = (permission: Permission | Permission[]): boolean => {
    // If admin, has all system permissions
    if (isAdmin) {
      return true;
    }

    // Otherwise check home permissions
    return hasPermission(homePermissions, permission);
  };

  /**
   * Check if user has ANY of the permissions
   */
  const canAny = (permissions: Permission[]): boolean => {
    if (isAdmin) return true;
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