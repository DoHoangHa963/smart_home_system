import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import { useHomeStore } from '@/store/homeStore';

export default function DashboardLayout() {
  const { currentHome, isLoading } = useHomeStore();
  
  // Nếu không có currentHome, redirect đến select-home
  if (!currentHome) {
    return <Navigate to="/select-home" replace />;
  }
  
  // Nếu đang loading, hiển thị loading spinner
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Đang tải thông tin nhà...</p>
        </div>
      </div>
    );
  }
  
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