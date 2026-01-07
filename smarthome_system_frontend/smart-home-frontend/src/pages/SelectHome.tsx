// pages/SelectHome.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHomeStore } from '@/store/homeStore';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, Plus, Users, DoorOpen, MapPin, CheckCircle2, ArrowRightLeft } from 'lucide-react'; // Thêm icon
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge'; // Thêm Badge
import CreateHomeModal from '@/pages/home/CreateHomeModal';
import { cn } from '@/lib/utils';

export default function SelectHome() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { homes, fetchMyHomes, setCurrentHome, currentHome, isLoading } = useHomeStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchMyHomes();
  }, []);

  const handleSelectHome = async (home: any) => {
    // Nếu chọn nhà đang active thì chỉ navigate, không cần set lại state (để tránh loading)
    if (currentHome?.id === home.id) {
      navigate('/dashboard');
      return;
    }
    
    await setCurrentHome(home);
    navigate('/dashboard');
  };

  // Tách danh sách nhà: Đang chọn vs Các nhà khác
  const activeHome = homes.find(h => h.id === currentHome?.id);
  const otherHomes = homes.filter(h => h.id !== currentHome?.id);

  if (isLoading && homes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="w-full max-w-4xl p-6">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 p-6 flex flex-col items-center">
      <div className="w-full max-w-6xl space-y-8">
        
        {/* Header */}
        <div className="text-center pt-8">
          <h1 className="text-3xl font-bold mb-2">Quản lý Nhà</h1>
          <p className="text-muted-foreground">
            {homes.length > 0 
              ? "Chọn nơi bạn muốn quản lý hoặc tạo mới" 
              : "Bắt đầu bằng việc tạo ngôi nhà đầu tiên của bạn"}
          </p>
        </div>

        {homes.length === 0 ? (
          // Empty State
          <Card className="max-w-md mx-auto mt-10">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Home className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Chưa có nhà nào</CardTitle>
              <CardDescription>
                Tạo nhà đầu tiên của bạn để bắt đầu sử dụng hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" onClick={() => setShowCreateModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Tạo nhà mới
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            
            {/* PHẦN 1: NHÀ ĐANG ĐƯỢC CHỌN (Current Home) */}
            {activeHome && (
              <div className="max-w-4xl mx-auto">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Đang truy cập
                </h2>
                <Card className="border-2 border-green-500/20 bg-green-50/50 dark:bg-green-900/10 shadow-md">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                      
                      {/* Info */}
                      <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                          <Home className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold">{activeHome.name}</h3>
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700">Active</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                             {activeHome.ownerUsername === user?.username ? 'Bạn là chủ nhà' : 'Bạn là thành viên'}
                          </p>
                          <div className="flex items-center gap-4 text-sm pt-1">
                             <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Users className="h-4 w-4" /> {activeHome.memberCount || 0} thành viên
                             </div>
                             <div className="flex items-center gap-1.5 text-muted-foreground">
                                <DoorOpen className="h-4 w-4" /> {activeHome.roomCount || 0} phòng
                             </div>
                          </div>
                        </div>
                      </div>

                      {/* Action */}
                      <Button size="lg" onClick={() => handleSelectHome(activeHome)} className="w-full md:w-auto min-w-[150px]">
                        Vào Dashboard
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* PHẦN 2: DANH SÁCH NHÀ KHÁC & TẠO MỚI */}
            <div>
              <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                {activeHome ? 'Chuyển sang nhà khác' : 'Danh sách nhà'}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Nút Tạo Mới */}
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all border-dashed border-2 hover:border-primary group bg-muted/5"
                  onClick={() => setShowCreateModal(true)}
                >
                  <CardContent className="flex flex-col items-center justify-center h-full min-h-[220px] text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center mb-4 transition-colors">
                      <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                      Thêm nhà mới
                    </h3>
                  </CardContent>
                </Card>

                {/* Danh sách Other Homes */}
                {otherHomes.map((home) => (
                  <Card
                    key={home.id}
                    className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 group relative overflow-hidden"
                    onClick={() => handleSelectHome(home)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Home className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {home.name}
                            </CardTitle>
                            <Badge variant="secondary" className="mt-1 text-[10px] font-normal">
                              {home.ownerUsername === user?.username ? 'Owner' : 'Member'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {home.address && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span className="truncate">{home.address}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3 w-3" />
                          <span>{home.memberCount || 0}</span>
                        </div>
                        <div className="h-3 w-[1px] bg-border"></div>
                        <div className="flex items-center gap-1.5">
                          <DoorOpen className="h-3 w-3" />
                          <span>{home.roomCount || 0} phòng</span>
                        </div>
                      </div>

                      <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all" size="sm">
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                        Chuyển sang nhà này
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <CreateHomeModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(home) => {
          setShowCreateModal(false);
          handleSelectHome(home); // Tự động chọn nhà mới tạo
        }}
      />
    </div>
  );
}