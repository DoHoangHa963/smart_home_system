import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Dashboard from '@/pages/Dashboard';
import Devices from '@/pages/Devices';
import Members from '@/pages/Members';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Auth from '@/pages/auth/Auth'
import AuthWatcher from './AuthWatcher';

import SelectHome from '@/pages/SelectHome';
import SystemUsers from '@/pages/admin/SystemUsers';
import SystemHomes from '@/pages/admin/SystemHomes';

import { Toaster } from "@/components/ui/sonner";

// Các trang chưa làm thì tạo Component rỗng tạm (Placeholder)
const Rooms = () => <div className="text-2xl font-bold">Quản lý Phòng (Coming Soon)</div>;
const NotFound = () => <div className="text-center mt-20">404 - Không tìm thấy trang</div>;

export default function App() {
  return (
    <BrowserRouter>
    <AuthWatcher />
      <Routes>
        <Route path="/auth" element={<Auth />} />
        {/* <Route path="/register" element={<Register />} /> */}

        <Route element={<ProtectedRoute />}>
          <Route path="/select-home" element={<SelectHome />} />

          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="devices" element={<Devices />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="members" element={<Members />} />
            <Route path="/system/users" element={<SystemUsers />} />
            <Route path="/system/homes" element={<SystemHomes />} />

          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}