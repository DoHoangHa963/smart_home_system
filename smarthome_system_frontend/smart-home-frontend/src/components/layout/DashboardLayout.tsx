import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Wrapper */}
      <div className="flex flex-col md:pl-64 transition-all duration-300">
        <Header />
        
        <main className="flex-1 p-6 md:p-8 pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}