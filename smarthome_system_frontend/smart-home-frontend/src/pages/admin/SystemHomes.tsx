import { useEffect, useState, useMemo } from 'react';
import { adminHomeApi } from '@/lib/api/admin-home.api';
import type { HomeResponse } from '@/types/home';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  MoreHorizontal, 
  Building2,
  Trash2, 
  Loader2,
  Home as HomeIcon,
  MapPin,
  Calendar,
  Users,
  DoorOpen,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  Copy,
  Eye, 
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';

export default function SystemHomes() {
  const [allHomes, setAllHomes] = useState<HomeResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State cho Modal xem chi tiết
  const [selectedHome, setSelectedHome] = useState<HomeResponse | null>(null);
  
  // Client-side Pagination State
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  // Filter & Sort State
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');

  const debouncedSearch = useDebounce(searchTerm, 300);

  const fetchHomes = async () => {
    setIsLoading(true);
    try {
        const response = await adminHomeApi.getAllHomes();
        if (response.data.success && response.data.data?.content) {
          setAllHomes(response.data.data.content.flat());
        } else {
          setAllHomes([]);
        }
    } catch (error: any) {
        toast.error(error?.response?.data?.message || 'Không thể tải danh sách nhà');
        console.error('Fetch homes error:', error);
        setAllHomes([]);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHomes();
  }, []);

  const processedData = useMemo(() => {
    let result = [...allHomes];

    // Filter
    if (debouncedSearch) {
      const lowerTerm = debouncedSearch.toLowerCase();
      result = result.filter(
        (h) => 
          (h.name && h.name.toLowerCase().includes(lowerTerm)) || 
          (h.ownerUsername && h.ownerUsername.toLowerCase().includes(lowerTerm)) ||
          (h.address && h.address.toLowerCase().includes(lowerTerm))
      );
    }

    // Sort
    result.sort((a, b) => {
      let valA: any = a[sortBy as keyof HomeResponse];
      let valB: any = b[sortBy as keyof HomeResponse];
      if (valA === null || valA === undefined) valA = '';
      if (valB === null || valB === undefined) valB = '';
      if (valA < valB) return sortDirection === 'ASC' ? -1 : 1;
      if (valA > valB) return sortDirection === 'ASC' ? 1 : -1;
      return 0;
    });

    return result;
  }, [allHomes, debouncedSearch, sortBy, sortDirection]);

  const totalElements = processedData.length;
  const totalPages = Math.ceil(totalElements / pageSize);
  const paginatedHomes = processedData.slice(page * pageSize, (page + 1) * pageSize);

  // --- HANDLERS ---
  const handleDeleteHome = async (homeId: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nhà này? Hành động này có thể không thể hoàn tác.')) return;
    try {
      await adminHomeApi.deleteHome(homeId);
      toast.success('Đã xóa nhà thành công');
      fetchHomes();
      if (selectedHome?.id === homeId) setSelectedHome(null);
    } catch (error: any) {
      if (error?.response?.status === 403) {
        toast.error('Không thể xóa: Bạn không phải chủ sở hữu nhà này.');
      } else {
        toast.error(error?.response?.data?.message || 'Xóa thất bại');
      }
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setPage(0);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      });
    } catch { return dateString; }
  };

  return (
    <div className="p-6 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8" /> Quản lý Nhà
          </h1>
          <p className="text-muted-foreground mt-1">
            Tổng số: <span className="font-semibold">{totalElements}</span> nhà trong hệ thống
          </p>
        </div>
        
        <Button onClick={fetchHomes} variant="outline" size="sm" disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* FILTER & SORT BAR */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Tìm theo tên nhà, chủ sở hữu, địa chỉ..." 
            className="pl-9" 
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Sắp xếp" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Ngày tạo</SelectItem>
            <SelectItem value="name">Tên nhà</SelectItem>
            <SelectItem value="memberCount">Số thành viên</SelectItem>
            <SelectItem value="roomCount">Số phòng</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortDirection} onValueChange={(v) => setSortDirection(v as 'ASC' | 'DESC')}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="DESC">Giảm dần</SelectItem>
            <SelectItem value="ASC">Tăng dần</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* TABLE */}
      <div className="border rounded-lg bg-background overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px] font-bold">Thông tin Nhà</TableHead>
              <TableHead className="font-bold">Chủ sở hữu</TableHead>
              <TableHead className="font-bold">Địa chỉ</TableHead>
              <TableHead className="font-bold text-center">Thống kê</TableHead>
              <TableHead className="font-bold">Ngày tạo</TableHead>
              <TableHead className="font-bold text-center w-[100px]">Hành động</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                   <div className="flex justify-center items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin" /> Đang tải dữ liệu...
                   </div>
                </TableCell>
              </TableRow>
            ) : paginatedHomes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <HomeIcon className="h-12 w-12 opacity-50" />
                    <p>Không tìm thấy nhà nào</p>
                    {(searchTerm) && (
                      <Button variant="link" size="sm" onClick={() => handleSearchChange('')}>
                        Xóa bộ lọc
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedHomes.map((home) => (
                <TableRow key={home.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-semibold text-base">{home.name}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                         ID: {home.id}
                         {home.timeZone && ` • ${home.timeZone}`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <div className="bg-primary/10 p-1.5 rounded-full">
                            <User className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{home.ownerUsername}</span>
                            <span className="text-[10px] text-muted-foreground font-mono" title={home.ownerId}>
                                {home.ownerId.substring(0, 8)}...
                            </span>
                        </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {home.address ? (
                        <div className="flex items-start gap-1 max-w-[200px]">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <span className="text-sm truncate">{home.address}</span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground text-sm italic">Chưa cập nhật</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-3">
                        <Badge variant="secondary" className="gap-1">
                            <Users className="h-3 w-3" /> {home.memberCount}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                            <DoorOpen className="h-3 w-3" /> {home.roomCount}
                        </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {formatDate(home.createdAt)}
                    </div>
                  </TableCell>

                  {/* UPDATE: Actions Column */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                        {/* 1. Nút Xem chi tiết trực tiếp */}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setSelectedHome(home)}
                            title="Xem chi tiết"
                        >
                            <Eye className="h-4 w-4" />
                        </Button>

                        {/* 2. Dropdown cho các hành động phụ */}
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(home.id.toString())}>
                                <Copy className="mr-2 h-4 w-4" /> Sao chép ID Nhà
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(home.ownerId)}>
                                <Copy className="mr-2 h-4 w-4" /> Sao chép ID Chủ nhà
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                onClick={() => handleDeleteHome(home.id)} 
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                            <Trash2 className="mr-2 h-4 w-4" /> Xóa nhà
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
            Trang <span className="font-medium">{page + 1}</span> / <span className="font-medium">{totalPages || 1}</span>
            {' '}· Hiển thị <span className="font-medium">{paginatedHomes.length}</span> / <span className="font-medium">{totalElements}</span> kết quả
        </div>
        
        <div className="flex items-center gap-4">
            <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
                <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="5">5 / trang</SelectItem>
                    <SelectItem value="10">10 / trang</SelectItem>
                    <SelectItem value="20">20 / trang</SelectItem>
                    <SelectItem value="50">50 / trang</SelectItem>
                </SelectContent>
            </Select>

            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(0)} disabled={page === 0}>Đầu</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}><ChevronRight className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>Cuối</Button>
            </div>
        </div>
      </div>

      {/* MODAL CHI TIẾT NHÀ */}
      <Dialog open={!!selectedHome} onOpenChange={(open) => !open && setSelectedHome(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building2 className="h-6 w-6 text-primary" />
              Chi tiết Nhà
            </DialogTitle>
            <DialogDescription>
              Thông tin đầy đủ về nhà <span className="font-semibold text-foreground">{selectedHome?.name}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedHome && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Tên nhà</h4>
                  <p className="font-medium text-base">{selectedHome.name}</p>
                </div>
                <div className="space-y-1">
                   <h4 className="text-sm font-medium text-muted-foreground">ID Nhà</h4>
                   <p className="font-mono text-sm bg-muted inline-block px-2 py-0.5 rounded">{selectedHome.id}</p>
                </div>
                <div className="col-span-2 space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">Địa chỉ</h4>
                  <div className="flex items-start gap-2">
                     <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                     <p className="text-sm">{selectedHome.address || 'Chưa cập nhật'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t my-1" />

              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" /> Chủ sở hữu
                </h4>
                <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg border">
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Tên tài khoản</span>
                        <p className="font-medium">{selectedHome.ownerUsername}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">User ID</span>
                        <div className="flex items-center gap-2">
                             <p className="text-xs font-mono truncate max-w-[150px]" title={selectedHome.ownerId}>
                                {selectedHome.ownerId}
                             </p>
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-5 w-5" 
                                onClick={() => navigator.clipboard.writeText(selectedHome.ownerId)}
                             >
                                <Copy className="h-3 w-3" />
                             </Button>
                        </div>
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Quy mô</h4>
                    <div className="flex gap-3">
                        <Badge variant="secondary" className="px-3 py-1 text-sm flex gap-2">
                             <Users className="h-4 w-4" /> {selectedHome.memberCount} Thành viên
                        </Badge>
                        <Badge variant="outline" className="px-3 py-1 text-sm flex gap-2">
                             <DoorOpen className="h-4 w-4" /> {selectedHome.roomCount} Phòng
                        </Badge>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <h4 className="text-sm font-semibold">Hệ thống</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span>Múi giờ: {selectedHome.timeZone || 'Mặc định'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Tạo ngày: {formatDate(selectedHome.createdAt)}</span>
                        </div>
                    </div>
                 </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}