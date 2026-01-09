import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHomeStore } from '@/store/homeStore';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Home as HomeIcon, Plus, Users, DoorOpen, MapPin, CheckCircle2, ArrowRightLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import CreateHomeModal from '@/pages/home/CreateHomeModal';
import { cn } from '@/lib/utils';

export default function SelectHome() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const { 
    homes, 
    fetchMyHomes, 
    setCurrentHome, 
    currentHome, 
    isLoading,
    setLoading
  } = useHomeStore();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchMyHomes();
  }, []);

  const handleSelectHome = async (home: any) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setLoading(true);
    
    try {
      await setCurrentHome(home);
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 200);
    } catch (error: any) {
      console.error('Lỗi khi chọn nhà:', error);
      toast.error(`Không thể chọn nhà: ${error.message || 'Có lỗi xảy ra'}`);
      setIsProcessing(false);
      setLoading(false);
    }
  };

  const handleCreateHomeSuccess = async (home: any) => {
    setShowCreateModal(false);
    await fetchMyHomes();
    toast.success(`Đã tạo nhà "${home.name}" thành công!`);
    setTimeout(() => {
      toast.info(`Hãy chọn nhà "${home.name}" để vào Dashboard`);
    }, 500);
  };

  if (isLoading && homes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-4xl p-6 space-y-6">
          <Skeleton className="h-12 w-64 mx-auto rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeHome = currentHome ? homes.find(h => h.id === currentHome.id) : null;
  const otherHomes = currentHome ? homes.filter(h => h.id !== currentHome.id) : homes;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center p-4 sm:p-6 transition-colors duration-300">
      
      {/* Background Decor - Hiệu ứng nền nhẹ cho Dark Mode */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[400px] bg-primary/5 dark:bg-primary/10 blur-[100px] -z-10 rounded-full opacity-50 pointer-events-none" />

      <div className="w-full max-w-6xl space-y-10 z-10 py-4 sm:py-8">
        
        {/* Header Section */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">
            Chọn không gian của bạn
          </h1>
          <p className="text-muted-foreground text-lg">
            {homes.length > 0 
              ? "Quản lý các ngôi nhà thông minh từ một nơi duy nhất" 
              : "Bắt đầu hành trình Smarthome bằng việc tạo ngôi nhà đầu tiên"}
          </p>
        </div>

        {homes.length === 0 ? (
          /* Empty State - Được làm đẹp hơn */
          <Card className="max-w-md mx-auto mt-10 border-dashed border-2 bg-card/50 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 ring-1 ring-primary/20">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-xl">Chào mừng bạn mới!</CardTitle>
              <p className="text-muted-foreground">
                Hệ thống chưa ghi nhận ngôi nhà nào. Hãy tạo mới để trải nghiệm.
              </p>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full h-11 text-base shadow-lg shadow-primary/20" 
                onClick={() => setShowCreateModal(true)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-5 w-5" />
                )}
                {isProcessing ? 'Đang khởi tạo...' : 'Tạo ngôi nhà đầu tiên'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
            
            {/* ACTIVE HOME SECTION - Hero Card */}
            {activeHome && (
              <div className="max-w-4xl mx-auto">
                 <div className="flex items-center gap-2 mb-4 px-1">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      Đang truy cập
                    </h2>
                 </div>
                
                <Card className="border-green-500/30 dark:border-green-500/40 bg-gradient-to-br from-green-50/80 via-white to-white dark:from-green-950/40 dark:via-card dark:to-card shadow-xl shadow-green-500/5 dark:shadow-green-900/10 overflow-hidden relative">
                  {/* Decorative Glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-[50px] rounded-full pointer-events-none" />
                  
                  <CardContent className="p-6 sm:p-8">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                      
                      <div className="flex items-start gap-5">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-950/20 border border-green-200 dark:border-green-800 flex items-center justify-center shrink-0 shadow-inner">
                          <HomeIcon className="h-9 w-9 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-2xl font-bold tracking-tight text-foreground">{activeHome.name}</h3>
                            <Badge variant="outline" className="border-green-500/50 text-green-700 dark:text-green-400 bg-green-500/10">
                              Active
                            </Badge>
                          </div>
                          
                          <p className="text-sm font-medium text-muted-foreground">
                            {activeHome.ownerUsername === user?.username ? (
                              <span className="text-green-600 dark:text-green-500 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Chủ sở hữu
                              </span>
                            ) : 'Thành viên'}
                          </p>

                          <div className="flex items-center gap-4 text-sm pt-1">
                             <div className="flex items-center gap-1.5 text-muted-foreground bg-background/50 px-2 py-1 rounded-md border border-border/50">
                              <Users className="h-4 w-4" /> {activeHome.memberCount || 0}
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground bg-background/50 px-2 py-1 rounded-md border border-border/50">
                              <DoorOpen className="h-4 w-4" /> {activeHome.roomCount || 0}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="w-full md:w-auto mt-2 md:mt-0">
                        <Button 
                          size="lg" 
                          onClick={() => handleSelectHome(activeHome)} 
                          className="w-full md:w-auto min-w-[160px] bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:text-white dark:hover:bg-green-500 shadow-lg shadow-green-500/20 font-semibold"
                          disabled={isProcessing}
                        >
                          {isProcessing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : <ArrowRightLeft className="mr-2 h-4 w-4" />}
                          Vào Dashboard
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* OTHER HOMES LIST */}
            <div>
               {activeHome && (
                 <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 px-1">
                   Các địa điểm khác
                 </h2>
               )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* Create New Card */}
                <Card
                  className="cursor-pointer border-dashed border-2 hover:border-primary/50 hover:bg-muted/50 transition-all duration-300 group h-full bg-transparent"
                  onClick={() => setShowCreateModal(true)}
                >
                  <CardContent className="flex flex-col items-center justify-center h-full min-h-[180px] p-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-colors duration-300">
                      <Plus className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      Thêm nhà mới
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Thiết lập không gian mới
                    </p>
                  </CardContent>
                </Card>

                {/* Other Home Cards */}
                {otherHomes.map((home) => (
                  <Card
                    key={home.id}
                    className="group relative cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border-border bg-card overflow-hidden"
                    onClick={() => handleSelectHome(home)}
                  >
                     <div className="absolute top-0 left-0 w-1 h-full bg-primary/0 group-hover:bg-primary transition-colors duration-300" />
                    
                    <CardHeader className="pb-3 pt-5 px-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3.5">
                          <div className="w-11 h-11 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform duration-300">
                            <HomeIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1">
                              {home.name}
                            </CardTitle>
                             <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-[10px] px-1.5 h-5 font-medium bg-secondary/50">
                                  {home.ownerUsername === user?.username ? 'Owner' : 'Member'}
                                </Badge>
                             </div>
                          </div>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="px-5 pb-5 space-y-4">
                      {home.address && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-1.5 rounded-md">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{home.address}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm text-muted-foreground pt-1">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          <span>{home.memberCount || 0} TV</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DoorOpen className="h-3.5 w-3.5" />
                          <span>{home.roomCount || 0} phòng</span>
                        </div>
                      </div>

                      <div className="pt-2 opacity-0 max-h-0 group-hover:opacity-100 group-hover:max-h-12 transition-all duration-300 ease-in-out">
                         <Button variant="outline" size="sm" className="w-full text-xs hover:bg-primary hover:text-primary-foreground">
                            Chuyển sang nhà này
                         </Button>
                      </div>
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
        onSuccess={handleCreateHomeSuccess}
      />
    </div>
  );
}