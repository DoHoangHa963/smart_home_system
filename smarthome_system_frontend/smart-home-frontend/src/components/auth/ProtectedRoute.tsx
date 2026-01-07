// components/auth/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { usePermission } from '@/hooks/usePermission';
import { useEffect } from 'react';

export default function ProtectedRoute() {
  const { isAuthenticated, accessToken } = useAuthStore();
  const { isAdmin, hasHomeAccess } = usePermission();
  const location = useLocation();

  // Không đăng nhập -> redirect to login
  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // ============================================
  // SMART REDIRECT LOGIC
  // ============================================

  // User đang truy cập trang system/* nhưng không phải admin
  const isSystemPage = location.pathname.startsWith('/system/');
  if (isSystemPage && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // User không phải admin và chưa có home -> redirect to select-home
  // TRỪ KHI đang ở trang select-home
  if (!isAdmin && !hasHomeAccess && location.pathname !== '/select-home') {
    return <Navigate to="/select-home" replace />;
  }

  return <Outlet />;
}