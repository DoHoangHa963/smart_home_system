// components/auth/PermissionGate.tsx
import { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';
import type { Permission, HomeRole } from '@/types/permission';

interface PermissionGateProps {
  children: ReactNode;
  permission?: Permission | Permission[];
  role?: HomeRole;
  requireAll?: boolean; // true = need ALL permissions, false = need ANY
  fallback?: ReactNode;
  showAlert?: boolean; // Show access denied message
}

export const PermissionGate = ({
  children,
  permission,
  role,
  requireAll = true,
  fallback = null,
  showAlert = false,
}: PermissionGateProps) => {
  const { can, canAny, hasRole, isAdmin } = usePermission();

  // Admin has access to everything
  if (isAdmin) {
    return <>{children}</>;
  }

  let hasAccess = true;

  // Check role if specified
  if (role && !hasRole(role)) {
    hasAccess = false;
  }

  // Check permissions if specified
  if (hasAccess && permission) {
    if (requireAll) {
      hasAccess = can(permission);
    } else {
      hasAccess = canAny(Array.isArray(permission) ? permission : [permission]);
    }
  }

  if (!hasAccess) {
    if (showAlert) {
      return (
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>
            Bạn không có quyền truy cập chức năng này.
          </AlertDescription>
        </Alert>
      );
    }
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Shortcut components
export const AdminOnly = ({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) => {
  const { isAdmin } = usePermission();
  return isAdmin ? <>{children}</> : <>{fallback}</>;
};

export const OwnerOnly = ({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) => {
  const { isOwner } = usePermission();
  return isOwner ? <>{children}</> : <>{fallback}</>;
};

export const OwnerOrAdminOnly = ({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) => {
  const { isOwnerOrAdmin } = usePermission();
  return isOwnerOrAdmin ? <>{children}</> : <>{fallback}</>;
};