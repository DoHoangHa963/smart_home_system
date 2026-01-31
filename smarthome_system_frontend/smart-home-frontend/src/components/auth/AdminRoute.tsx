// components/auth/AdminRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/store/authStore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldAlert } from 'lucide-react';

/**
 * Route guard for Admin-only pages
 */
export const AdminRoute = () => {
  const { isAuthenticated } = useAuthStore();
  const { isAdmin } = usePermission();

  // Not logged in -> redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Not admin -> show access denied
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Truy cập bị từ chối</AlertTitle>
          <AlertDescription>
            Bạn không có quyền truy cập khu vực quản trị. Chỉ Admin mới có thể
            truy cập trang này.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <Outlet />;
};

/**
 * Route guard that requires user to be member of a home
 */
export const HomeRequiredRoute = () => {
  const { isAuthenticated } = useAuthStore();
  const { hasHomeAccess } = usePermission();

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // User has no home access -> redirect to home selection
  if (!hasHomeAccess) {
    return <Navigate to="/select-home" replace />;
  }

  return <Outlet />;
};