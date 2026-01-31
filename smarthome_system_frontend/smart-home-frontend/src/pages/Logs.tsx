import { useState, useEffect } from 'react';
import { useHomeStore } from '@/store/homeStore';
import { usePermission } from '@/hooks/usePermission';
import { HOME_PERMISSIONS } from '@/types/permission';
import { logApi } from '@/lib/api/log.api';
import { EventLog, EventLogFilters } from '@/types/log';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { History, RefreshCw, Filter, X, Calendar, User, Cpu, Home, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale/vi';

export default function Logs() {
  const { currentHome } = useHomeStore();
  const { can, hasHomeAccess, isAdmin } = usePermission();
  const canViewLogs = isAdmin || can(HOME_PERMISSIONS.HOME_LOGS_VIEW);

  const [logs, setLogs] = useState<EventLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters] = useState<EventLogFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  // Event types for filter
  const eventTypes = [
    'DEVICE_CREATE',
    'DEVICE_UPDATE',
    'DEVICE_DELETE',
    'DEVICE_TURN_ON',
    'DEVICE_TURN_OFF',
    'DEVICE_TOGGLE',
    'ROOM_CREATE',
    'ROOM_UPDATE',
    'ROOM_DELETE',
    'MEMBER_ADD',
    'MEMBER_REMOVE',
    'MEMBER_UPDATE_ROLE',
    'HOME_CREATE',
    'HOME_UPDATE',
    'HOME_DELETE',
  ];

  const fetchLogs = async () => {
    if (!currentHome?.id || !canViewLogs) return;

    setIsLoading(true);
    try {
      const response = await logApi.getLogsByHome(currentHome.id, page, pageSize, filters);
      setLogs(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (error: any) {
      console.error('Failed to fetch logs:', error);
      toast.error('Không thể tải nhật ký hoạt động');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentHome?.id, page, pageSize, filters]);

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setPage(0);
  };

  const handleFilterChange = (key: keyof EventLogFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(0); // Reset to first page when filter changes
  };

  const clearFilters = () => {
    setFilters({});
    setPage(0);
  };

  const getEventTypeBadgeVariant = (eventType: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (eventType.includes('DELETE') || eventType.includes('ERROR')) {
      return 'destructive';
    }
    if (eventType.includes('CREATE') || eventType.includes('ADD')) {
      return 'default';
    }
    if (eventType.includes('UPDATE') || eventType.includes('TURN_ON')) {
      return 'secondary';
    }
    return 'outline';
  };

  const formatEventType = (eventType: string): string => {
    return eventType
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDateTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy HH:mm:ss', { locale: vi });
    } catch {
      return dateString;
    }
  };

  const formatRelativeTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Vừa xong';
      if (diffMins < 60) return `${diffMins} phút trước`;
      if (diffHours < 24) return `${diffHours} giờ trước`;
      if (diffDays < 7) return `${diffDays} ngày trước`;
      return formatDateTime(dateString);
    } catch {
      return dateString;
    }
  };

  if (!hasHomeAccess && !isAdmin) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Alert className="max-w-md">
          <AlertDescription>Vui lòng chọn nhà trước</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!canViewLogs) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>Bạn không có quyền xem nhật ký hoạt động</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 px-4 md:px-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <History className="h-6 w-6 text-primary" />
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Nhật ký hoạt động
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Xem lịch sử các hoạt động trong nhà của bạn
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Lọc
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>
        </div>

        {/* FILTERS */}
        {showFilters && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bộ lọc</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Loại sự kiện</label>
                  <Select
                    value={filters.eventType || 'ALL'}
                    onValueChange={(value) => handleFilterChange('eventType', value === 'ALL' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tất cả</SelectItem>
                      {eventTypes.map(type => (
                        <SelectItem key={type} value={type}>
                          {formatEventType(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Từ ngày</label>
                  <Input
                    type="datetime-local"
                    value={filters.startDate || ''}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Đến ngày</label>
                  <Input
                    type="datetime-local"
                    value={filters.endDate || ''}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Xóa bộ lọc
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STATS */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Tổng cộng: {totalElements} sự kiện</span>
          {Object.keys(filters).length > 0 && (
            <Badge variant="secondary" className="ml-2">
              Đang lọc
            </Badge>
          )}
        </div>
      </div>

      {/* LOGS LIST */}
      <div className="space-y-3">
        {isLoading && logs.length === 0 ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Không có nhật ký hoạt động nào</p>
            </CardContent>
          </Card>
        ) : (
          logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            return (
              <Card 
                key={log.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
              >
                <CardContent className="p-4">
                  {/* COMPACT VIEW */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getEventTypeBadgeVariant(log.eventType)}>
                          {formatEventType(log.eventType)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {log.source}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span className="truncate">{log.username}</span>
                        {log.deviceName && (
                          <>
                            <span>·</span>
                            <Cpu className="h-3 w-3" />
                            <span className="truncate">{log.deviceName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        <div>{formatRelativeTime(log.createdAt)}</div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* EXPANDED DETAIL VIEW */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="text-xs text-muted-foreground">Người dùng</div>
                              <div className="font-medium">{log.username}</div>
                              {log.userId && (
                                <div className="text-xs text-muted-foreground">ID: {log.userId}</div>
                              )}
                            </div>
                          </div>
                          
                          {log.deviceName && (
                            <div className="flex items-center gap-2">
                              <Cpu className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-xs text-muted-foreground">Thiết bị</div>
                                <div className="font-medium">{log.deviceName}</div>
                                {log.deviceCode && (
                                  <div className="text-xs text-muted-foreground">Code: {log.deviceCode}</div>
                                )}
                                {log.deviceId && (
                                  <div className="text-xs text-muted-foreground">ID: {log.deviceId}</div>
                                )}
                              </div>
                            </div>
                          )}

                          {log.homeName && (
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-xs text-muted-foreground">Nhà</div>
                                <div className="font-medium">{log.homeName}</div>
                                {log.homeId && (
                                  <div className="text-xs text-muted-foreground">ID: {log.homeId}</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Loại sự kiện</div>
                            <Badge variant={getEventTypeBadgeVariant(log.eventType)}>
                              {formatEventType(log.eventType)}
                            </Badge>
                          </div>

                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Nguồn</div>
                            <Badge variant="outline">{log.source}</Badge>
                          </div>

                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Thời gian</div>
                            <div className="font-medium">{formatDateTime(log.createdAt)}</div>
                            <div className="text-xs text-muted-foreground">{formatRelativeTime(log.createdAt)}</div>
                          </div>
                        </div>
                      </div>

                      {log.eventValue && (
                        <div className="pt-2 border-t">
                          <div className="text-xs text-muted-foreground mb-2">Chi tiết sự kiện</div>
                          <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto">
                            <pre className="whitespace-pre-wrap break-words">
                              {(() => {
                                try {
                                  const parsed = JSON.parse(log.eventValue);
                                  return JSON.stringify(parsed, null, 2);
                                } catch {
                                  return log.eventValue;
                                }
                              })()}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* PAGINATION */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Trang <span className="font-medium">{page + 1}</span> / <span className="font-medium">{totalPages || 1}</span>
            {' '}· Tổng <span className="font-medium">{totalElements}</span> sự kiện
          </div>
          <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 / trang</SelectItem>
              <SelectItem value="10">10 / trang</SelectItem>
              <SelectItem value="20">20 / trang</SelectItem>
              <SelectItem value="50">50 / trang</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(0)} 
            disabled={page === 0 || isLoading}
          >
            Đầu
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage((p) => Math.max(0, p - 1))} 
            disabled={page === 0 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} 
            disabled={page >= totalPages - 1 || isLoading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setPage(totalPages - 1)} 
            disabled={page >= totalPages - 1 || isLoading}
          >
            Cuối
          </Button>
        </div>
      </div>
    </div>
  );
}
