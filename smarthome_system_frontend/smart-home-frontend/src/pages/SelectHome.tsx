import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHomeStore } from '@/store/homeStore';
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, Home as HomeIcon, Plus, Users, DoorOpen, MapPin, 
  CheckCircle2, ArrowRightLeft, Sparkles, MoreVertical,
  Edit, Trash2, UserCog, LogOut, Shield, ChevronLeft, ChevronRight,
  ArrowRight, Search, Filter, X, SearchX, Cpu, Wifi, WifiOff
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CreateHomeModal from '@/pages/home/CreateHomeModal';
import EditHomeModal from '@/pages/home/EditHomeModal';
import HomeEntryDialog from '@/components/mcu/HomeEntryDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { homeApi } from '@/lib/api/home.api';
import type { Home } from '@/types/home';

export default function SelectHome() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isAdmin } = usePermission();

  const [allHomes, setAllHomes] = useState<any[]>([]);
  const [filteredHomes, setFilteredHomes] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ 
    page: 0, 
    size: 20, 
    total: 0 
  });
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  
  // Search và filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  
  const { 
    homes, 
    fetchMyHomes, 
    setCurrentHome, 
    currentHome, 
    isLoading,
    setLoading,
    deleteHome,
    leaveHome,
    fetchHomeMembers
  } = useHomeStore();
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedHome, setSelectedHome] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [homeToAction, setHomeToAction] = useState<any>(null);
  
  // MCU Entry Dialog state
  const [showEntryDialog, setShowEntryDialog] = useState(false);
  const [homeToEnter, setHomeToEnter] = useState<Home | null>(null);

  useEffect(() => {
    const loadHomes = async () => {
      if (isAdmin) {
        await fetchAllHomes({ page: 0, size: 20 });
      } else {
        await fetchMyHomes();
      }
    };
    loadHomes();
  }, [isAdmin]);

  useEffect(() => {
    // Áp dụng search và filter khi allHomes thay đổi
    if (isAdmin && allHomes.length > 0) {
      applyFilters();
    }
  }, [allHomes, searchQuery, filterOwner, sortBy]);

  const fetchAllHomes = async (params: any) => {
    setIsAdminLoading(true);
    try {
      const response = await homeApi.getAllHomes(params);
      setAllHomes(response.data.content);
      setFilteredHomes(response.data.content); // Khởi tạo filteredHomes
      setPagination({
        page: response.data.number,
        size: response.data.size,
        total: response.data.totalElements
      });
    } catch (error: any) {
      toast.error(`Lỗi khi tải danh sách nhà: ${error.message || 'Có lỗi xảy ra'}`);
    } finally {
      setIsAdminLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...allHomes];
    
    // Áp dụng search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(home => 
        home.name.toLowerCase().includes(query) ||
        (home.address && home.address.toLowerCase().includes(query)) ||
        (home.ownerUsername && home.ownerUsername.toLowerCase().includes(query))
      );
    }
    
    // Áp dụng filter theo chủ nhà
    if (filterOwner !== 'all') {
      result = result.filter(home => {
        if (filterOwner === 'has-owner') {
          return home.ownerUsername && home.ownerUsername.trim() !== '';
        } else if (filterOwner === 'no-owner') {
          return !home.ownerUsername || home.ownerUsername.trim() === '';
        }
        return true;
      });
    }
    
    // Áp dụng sắp xếp
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'members-asc':
          return (a.memberCount || 0) - (b.memberCount || 0);
        case 'members-desc':
          return (b.memberCount || 0) - (a.memberCount || 0);
        case 'rooms-asc':
          return (a.roomCount || 0) - (b.roomCount || 0);
        case 'rooms-desc':
          return (b.roomCount || 0) - (a.roomCount || 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });
    
    setFilteredHomes(result);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilterOwner('all');
    setSortBy('name');
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 0 || newPage * pagination.size >= pagination.total) return;
    fetchAllHomes({ page: newPage, size: pagination.size });
  };

  const handleSelectHome = async (home: any) => {
    if (isProcessing) return;
    
    // Chỉ hiển thị dialog cho owner hoặc admin
    const isOwner = home?.ownerId === user?.id;
    if (isAdmin || isOwner) {
      // Show entry dialog to choose between dashboard and MCU setup
      setHomeToEnter(home);
      setShowEntryDialog(true);
    } else {
      // Nếu không phải owner/admin, vào dashboard trực tiếp
      setIsProcessing(true);
      setLoading(true);
      try {
        await setCurrentHome(home, false);
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 200);
      } catch (error: any) {
        console.error('Lỗi khi chọn nhà:', error);
        toast.error(`Không thể chọn nhà: ${error.message || 'Có lỗi xảy ra'}`);
        setIsProcessing(false);
        setLoading(false);
      }
    }
  };

  const proceedToDashboard = async () => {
    if (!homeToEnter || isProcessing) return;
    
    setIsProcessing(true);
    setLoading(true);
    
    try {
      // Truyền isAdmin vào để bypass permission check
      await setCurrentHome(homeToEnter, isAdmin);
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

  // Direct select home without dialog (for active home)
  const handleDirectSelectHome = async (home: any) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setLoading(true);
    
    try {
      await setCurrentHome(home, isAdmin);
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

  const handleEditHome = (home: any) => {
    setSelectedHome(home);
    setShowEditModal(true);
  };

  const handleDeleteHome = async (home: any) => {
    setHomeToAction(home);
    setDeleteDialogOpen(true);
  };

  const handleLeaveHome = async (home: any) => {
    setHomeToAction(home);
    setLeaveDialogOpen(true);
  };

  const confirmDeleteHome = async () => {
    if (!homeToAction) return;
    
    setIsProcessing(true);
    try {
      await deleteHome(homeToAction.id);
      toast.success(`Đã xóa nhà "${homeToAction.name}" thành công`);
      setDeleteDialogOpen(false);
      setHomeToAction(null);
      await fetchMyHomes();
    } catch (error: any) {
      toast.error(`Không thể xóa nhà: ${error.message || 'Có lỗi xảy ra'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmLeaveHome = async () => {
    if (!homeToAction) return;
    
    setIsProcessing(true);
    try {
      await leaveHome(homeToAction.id);
      toast.success(`Đã rời khỏi nhà "${homeToAction.name}" thành công`);
      setLeaveDialogOpen(false);
      setHomeToAction(null);
      await fetchMyHomes();
    } catch (error: any) {
      toast.error(`Không thể rời nhà: ${error.message || 'Có lỗi xảy ra'}`);
    } finally {
      setIsProcessing(false);
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

  const handleEditHomeSuccess = async (home: any) => {
    setShowEditModal(false);
    setSelectedHome(null);
    await fetchMyHomes();
    toast.success(`Đã cập nhật nhà "${home.name}" thành công!`);
  };

  const isHomeOwner = (home: any) => {
    return home.ownerUsername === user?.username;
  };

  // SỬA LOADING STATE
  if ((isLoading && homes.length === 0) || (isAdmin && isAdminLoading && allHomes.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-4xl p-6 space-y-6">
          <Skeleton className="h-12 w-64 mx-auto rounded-xl" />
          {isAdmin && (
            <Skeleton className="h-6 w-48 mx-auto rounded-md" />
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const displayHomes = isAdmin ? filteredHomes : homes;
  const displayLoading = isAdmin ? isAdminLoading : isLoading;
  const displayTotalHomes = isAdmin ? pagination.total : homes.length;

  const activeHome = currentHome ? displayHomes.find((h: any) => h.id === currentHome.id) : null;
  const otherHomes = activeHome 
    ? displayHomes.filter((h: any) => h.id !== currentHome.id) 
    : displayHomes;

  // Kiểm tra xem có đang tìm kiếm mà không có kết quả không
  const hasSearchQuery = isAdmin && searchQuery.trim() !== '';
  const noSearchResults = hasSearchQuery && filteredHomes.length === 0;

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
          
          {/* THÊM ADMIN BADGE */}
          {isAdmin && (
            <div className="flex items-center justify-center gap-2">
              <Badge 
                variant="outline" 
                className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30"
              >
                <Shield className="h-3 w-3 mr-1" />
                Chế độ Quản trị viên
              </Badge>
              <span className="text-sm text-muted-foreground">
                Đang xem tất cả {displayTotalHomes} nhà trong hệ thống
              </span>
            </div>
          )}
          
          <p className="text-muted-foreground text-lg">
            {displayHomes.length > 0 
              ? isAdmin 
                ? "Quản lý tất cả ngôi nhà trong hệ thống" 
                : "Quản lý các ngôi nhà thông minh từ một nơi duy nhất" 
              : "Bắt đầu hành trình Smarthome bằng việc tạo ngôi nhà đầu tiên"}
          </p>
        </div>

        {/* THÊM SEARCH BAR VÀ FILTER CHO ADMIN */}
        {isAdmin && allHomes.length > 0 && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo tên, địa chỉ, chủ nhà..."
                  className="pl-9 pr-9"
                  value={searchQuery}
                  onChange={handleSearch}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6"
                    onClick={clearSearch}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              {/* Filter by Owner */}
              <Select value={filterOwner} onValueChange={setFilterOwner}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="Lọc theo chủ" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả nhà</SelectItem>
                  <SelectItem value="has-owner">Có chủ nhà</SelectItem>
                  <SelectItem value="no-owner">Không có chủ</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Sort by */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sắp xếp" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Tên A-Z</SelectItem>
                  <SelectItem value="name-desc">Tên Z-A</SelectItem>
                  <SelectItem value="members-desc">Thành viên giảm dần</SelectItem>
                  <SelectItem value="members-asc">Thành viên tăng dần</SelectItem>
                  <SelectItem value="rooms-desc">Phòng giảm dần</SelectItem>
                  <SelectItem value="rooms-asc">Phòng tăng dần</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Kết quả tìm kiếm */}
            {searchQuery && !noSearchResults && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Tìm thấy <span className="font-semibold text-foreground">{filteredHomes.length}</span> kết quả cho "{searchQuery}"
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="h-7 px-2 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Xóa tìm kiếm
                </Button>
              </div>
            )}
          </div>
        )}

        {displayHomes.length === 0 && !displayLoading ? (
          /* Empty State - Hiển thị khi không có nhà nào */
          <Card className="max-w-md mx-auto mt-10 border-dashed border-2 bg-card/50 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              {noSearchResults ? (
                <>
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-6">
                    <SearchX className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-xl">Không tìm thấy kết quả</CardTitle>
                  <p className="text-muted-foreground">
                    Không có nhà nào phù hợp với "{searchQuery}"
                  </p>
                </>
              ) : (
                <>
                  <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 ring-1 ring-primary/20">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">Chào mừng bạn mới!</CardTitle>
                  <p className="text-muted-foreground">
                    Hệ thống chưa ghi nhận ngôi nhà nào. Hãy tạo mới để trải nghiệm.
                  </p>
                </>
              )}
            </CardHeader>
            <CardContent>
              {noSearchResults ? (
                <div className="space-y-3">
                  <Button 
                    className="w-full h-11 text-base" 
                    onClick={clearSearch}
                  >
                    <X className="mr-2 h-5 w-5" />
                    Xóa tìm kiếm
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full h-11 text-base" 
                    onClick={() => setShowCreateModal(true)}
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Tạo nhà mới
                  </Button>
                </div>
              ) : (
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
              )}
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
                            {isHomeOwner(activeHome) && (
                              <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                Chủ nhà
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm font-medium text-muted-foreground">
                            {isHomeOwner(activeHome) ? (
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

                      <div className="flex items-center gap-3">
                        {isHomeOwner(activeHome) && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditHome(activeHome)}
                            disabled={isProcessing}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Sửa
                          </Button>
                        )}
                        <Button 
                          size="lg" 
                          onClick={() => handleDirectSelectHome(activeHome)} 
                          className="min-w-[160px] bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:text-white dark:hover:bg-green-500 shadow-lg shadow-green-500/20 font-semibold"
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
               {activeHome && otherHomes.length > 0 && (
                 <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4 px-1">
                   Các địa điểm khác
                 </h2>
               )}
              
              {/* KHI TÌM KIẾM KHÔNG CÓ KẾT QUẢ - HIỂN THỊ NGAY TRONG LIST */}
              {noSearchResults ? (
                <div className="max-w-md mx-auto">
                  <Card className="border-dashed border-2 bg-card/50">
                    <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                        <SearchX className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        Không tìm thấy kết quả
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Không có nhà nào phù hợp với "{searchQuery}"
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 w-full">
                        <Button 
                          className="flex-1" 
                          onClick={clearSearch}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Xóa tìm kiếm
                        </Button>
                        <Button 
                          variant="outline"
                          className="flex-1" 
                          onClick={() => setShowCreateModal(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Tạo nhà mới
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
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
                                    {isHomeOwner(home) ? 'Owner' : 'Member'}
                                  </Badge>

                                    {/* THÊM BADGE HIỂN THỊ CHỦ NHÀ CHO ADMIN */}
                                  {isAdmin && home.ownerUsername && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 h-5 border-blue-300 text-blue-700 bg-blue-50">
                                      Chủ: {home.ownerUsername}
                                    </Badge>
                                  )}
                               </div>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleSelectHome(home)}>
                                <ArrowRightLeft className="h-4 w-4 mr-2" />
                                Chuyển sang
                              </DropdownMenuItem>
                              {isHomeOwner(home) && (
                                <>
                                  <DropdownMenuItem onClick={() => handleEditHome(home)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Chỉnh sửa
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={() => handleDeleteHome(home)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Xóa nhà
                                  </DropdownMenuItem>
                                </>
                              )}
                              {!isHomeOwner(home) && (
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => handleLeaveHome(home)}
                                >
                                  <LogOut className="h-4 w-4 mr-2" />
                                  Rời khỏi
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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

                        <div className="pt-2">
                          {!isAdmin ? (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full text-xs hover:bg-primary hover:text-primary-foreground"
                              onClick={() => handleSelectHome(home)}
                            >
                              Chuyển sang nhà này
                            </Button>
                          ) : (
                            <Button 
                              variant="outline"  
                              size="sm" 
                              className="w-full text-xs hover:bg-primary hover:text-primary-foreground"
                              onClick={() => handleSelectHome(home)}
                            >
                              <ArrowRight className="h-3 w-3 mr-1" />
                              Truy cập với tư cách Admin
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {/* THÊM SAU PHẦN GRID CARDS (trước khi đóng div space-y-10) */}
        {isAdmin && displayHomes.length > 0 && (
          <div className="max-w-4xl mx-auto mt-8 pt-6 border-t border-border">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Tổng số:</span> {pagination.total} nhà • 
                <span className="ml-2">Trang {pagination.page + 1} / {Math.max(1, Math.ceil(pagination.total / pagination.size))}</span>
                {searchQuery && !noSearchResults && (
                  <span className="ml-2">• Đang hiển thị {filteredHomes.length} kết quả</span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 0 || isAdminLoading}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Trước
                </Button>
                
                <div className="flex items-center gap-1">
                  {[...Array(Math.min(5, Math.ceil(pagination.total / pagination.size)))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={i}
                        variant={pagination.page + 1 === pageNum ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handlePageChange(pageNum - 1)}
                        disabled={isAdminLoading}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={(pagination.page + 1) * pagination.size >= pagination.total || isAdminLoading}
                >
                  Sau
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateHomeModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateHomeSuccess}
      />

      <EditHomeModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedHome(null);
        }}
        home={selectedHome}
        onSuccess={handleEditHomeSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa nhà</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa nhà "{homeToAction?.name}" không? Hành động này sẽ:
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>Xóa vĩnh viễn tất cả dữ liệu của nhà này</li>
                <li>Xóa tất cả các thành viên khỏi nhà</li>
                <li>Xóa tất cả các thiết bị và cài đặt liên quan</li>
              </ul>
              <p className="mt-2 font-semibold text-red-600">
                Hành động này không thể hoàn tác!
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteHome}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Xác nhận xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Home Confirmation Dialog */}
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận rời nhà</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn rời khỏi nhà "{homeToAction?.name}" không? 
              <ul className="mt-2 ml-4 list-disc text-sm">
                <li>Bạn sẽ mất quyền truy cập vào nhà này</li>
                <li>Tất cả các thiết bị của bạn trong nhà sẽ bị xóa</li>
                <li>Bạn có thể được mời lại nếu cần</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmLeaveHome}
              disabled={isProcessing}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Rời khỏi
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Home Entry Dialog - MCU Options */}
      <HomeEntryDialog
        open={showEntryDialog}
        onOpenChange={setShowEntryDialog}
        home={homeToEnter}
        onProceed={proceedToDashboard}
      />
    </div>
  );
}