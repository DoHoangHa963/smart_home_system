import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Dashboard from '@/pages/Dashboard';
import Device from '@/pages/device/Devices';
import Members from '@/pages/Members';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Auth from '@/pages/auth/Auth'
import AuthWatcher from './AuthWatcher';

import SelectHome from '@/pages/SelectHome';
import SystemUsers from '@/pages/admin/SystemUsers';
import SystemHomes from '@/pages/admin/SystemHomes';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import MCUSetup from '@/pages/mcu/MCUSetup';

import { Toaster } from "@/components/ui/sonner";
import Rooms from '@/pages/room/Rooms';
import Help from '@/pages/Help';
import Account from '@/pages/Account';
import HomeSettings from '@/pages/home/HomeSettings';
import RFID from '@/pages/rfid/RFID';
import Logs from '@/pages/Logs';
import Notifications from '@/pages/Notifications';
import Automations from '@/pages/Automations';

// Các trang chưa làm thì tạo Component rỗng tạm (Placeholder)
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
          <Route path="/mcu/setup" element={<MCUSetup />} />

          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />

            <Route path="dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<AdminDashboard />} />
            <Route path="devices" element={<Device />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="members" element={<Members />} />
            <Route path="rfid" element={<RFID />} />
            <Route path="logs" element={<Logs />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="automations" element={<Automations />} />
            <Route path="help" element={<Help />} />
            <Route path="account" element={<Account />} />
            <Route path="home-settings" element={<HomeSettings />} />
            <Route path="mcu/setup" element={<MCUSetup />} />

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