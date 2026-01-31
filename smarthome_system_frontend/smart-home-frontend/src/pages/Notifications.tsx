import { useState, useEffect, useCallback } from 'react';
import { useHomeStore } from '@/store/homeStore';
import { usePermission } from '@/hooks/usePermission';
import { HOME_PERMISSIONS } from '@/types/permission';
import { notificationApi } from '@/lib/api/notification.api';
import { Notification, NotificationFilters, NotificationType } from '@/types/notification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bell, RefreshCw, Filter, X, Calendar, User, Cpu, Home,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle, Info, Trash2, CheckCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale/vi';
import { webSocketService } from '@/lib/websocket';

export default function Notifications() {
  const { currentHome } = useHomeStore();
  const { can, hasHomeAccess, isAdmin } = usePermission();
  const canViewNotifications = isAdmin || can(HOME_PERMISSIONS.HOME_LOGS_VIEW);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filters, setFilters] = useState<NotificationFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [expandedNotificationId, setExpandedNotificationId] = useState<number | null>(null);

  const notificationTypes = [
    { value: NotificationType.EMERGENCY, label: 'Khẩn cấp' },
    { value: NotificationType.WARNING, label: 'Cảnh báo' },
    { value: NotificationType.INFO, label: 'Thông tin' },
    { value: NotificationType.SUCCESS, label: 'Thành công' },
  ];

  const fetchNotifications = useCallback(async () => {
    if (!canViewNotifications) return;

    setIsLoading(true);
    try {
      const response = await notificationApi.getNotifications(page, pageSize, filters);
      setNotifications(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (error: any) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Không thể tải thông báo');
    } finally {
      setIsLoading(false);
    }
  }, [canViewNotifications, page, pageSize, filters]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationApi.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  // Fetch notifications when dependencies change
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [currentHome?.id, page, pageSize, filters, fetchNotifications, fetchUnreadCount]);

  // WebSocket subscription for realtime emergency notifications
  useEffect(() => {
    if (!currentHome?.id || !canViewNotifications) return;

    const emergencyTopic = `/topic/home/${currentHome.id}/emergency`;

    // Activate WebSocket if not already active
    webSocketService.activate();

    // Subscribe to emergency notifications - refetch only when new active emergency arrives
    const subId = webSocketService.subscribe(emergencyTopic, (message) => {
      console.log('[Notifications] Received emergency via WebSocket:', message);

      // Only show toast and refetch for active emergencies
      // Ignore CLEARED messages (isActive=false) to avoid unnecessary notifications
      if (message?.isActive === true) {
        toast.warning('📢 Có thông báo khẩn cấp mới!', {
          description: 'Danh sách thông báo đã được cập nhật.',
          duration: 3000,
        });
        
        // Refetch notifications to show the new active emergency
        fetchNotifications();
        fetchUnreadCount();
      }
      // Do nothing for CLEARED messages (isActive=false) - they don't need immediate attention
    });

    return () => {
      if (subId) {
        webSocketService.unsubscribe(subId);
      }
    };
  }, [currentHome?.id, canViewNotifications, fetchNotifications, fetchUnreadCount]);

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setPage(0);
  };

  const handleFilterChange = (key: keyof NotificationFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({});
    setPage(0);
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      toast.success('Đã đánh dấu đã đọc');
    } catch (error: any) {
      console.error('Failed to mark as read:', error);
      toast.error('Không thể đánh dấu đã đọc');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('Đã đánh dấu tất cả đã đọc');
    } catch (error: any) {
      console.error('Failed to mark all as read:', error);
      toast.error('Không thể đánh dấu tất cả đã đọc');
    }
  };

  const handleDelete = async (notificationId: number) => {
    try {
      await notificationApi.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setTotalElements(prev => prev - 1);
      toast.success('Đã xóa thông báo');
    } catch (error: any) {
      console.error('Failed to delete notification:', error);
      toast.error('Không thể xóa thông báo');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa tất cả thông báo?')) return;

    try {
      await notificationApi.deleteAllNotifications();
      setNotifications([]);
      setTotalElements(0);
      setUnreadCount(0);
      toast.success('Đã xóa tất cả thông báo');
    } catch (error: any) {
      console.error('Failed to delete all notifications:', error);
      toast.error('Không thể xóa tất cả thông báo');
    }
  };

  const getNotificationTypeIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.EMERGENCY:
        return <AlertTriangle className="h-4 w-4" />;
      case NotificationType.WARNING:
        return <AlertTriangle className="h-4 w-4" />;
      case NotificationType.SUCCESS:
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getNotificationTypeBadgeVariant = (type: NotificationType): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (type) {
      case NotificationType.EMERGENCY:
        return 'destructive';
      case NotificationType.WARNING:
        return 'destructive';
      case NotificationType.SUCCESS:
        return 'default';
      default:
        return 'secondary';
    }
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

  if (!canViewNotifications) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>Bạn không có quyền xem thông báo</AlertDescription>
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
              <Bell className="h-6 w-6 text-primary" />
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                Thông báo
              </h1>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {unreadCount} chưa đọc
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Xem và quản lý các thông báo khẩn cấp, cảnh báo và thông tin từ hệ thống
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Đánh dấu tất cả đã đọc
              </Button>
            )}
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
              onClick={fetchNotifications}
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Loại thông báo</label>
                  <Select
                    value={filters.type || 'ALL'}
                    onValueChange={(value) => handleFilterChange('type', value === 'ALL' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tất cả</SelectItem>
                      {notificationTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Trạng thái</label>
                  <Select
                    value={filters.isRead === undefined ? 'ALL' : filters.isRead ? 'READ' : 'UNREAD'}
                    onValueChange={(value) => {
                      if (value === 'ALL') {
                        handleFilterChange('isRead', '');
                      } else {
                        handleFilterChange('isRead', value === 'READ' ? 'true' : 'false');
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tất cả</SelectItem>
                      <SelectItem value="UNREAD">Chưa đọc</SelectItem>
                      <SelectItem value="READ">Đã đọc</SelectItem>
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
          <span>Tổng cộng: {totalElements} thông báo</span>
          {Object.keys(filters).length > 0 && (
            <Badge variant="secondary" className="ml-2">
              Đang lọc
            </Badge>
          )}
        </div>
      </div>

      {/* NOTIFICATIONS LIST */}
      <div className="space-y-3">
        {isLoading && notifications.length === 0 ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Không có thông báo nào</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => {
            const isExpanded = expandedNotificationId === notification.id;
            return (
              <Card
                key={notification.id}
                className={`hover:shadow-md transition-shadow ${!notification.isRead ? 'border-l-4 border-l-primary bg-muted/30' : ''
                  }`}
              >
                <CardContent className="p-4">
                  {/* COMPACT VIEW */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getNotificationTypeBadgeVariant(notification.type)}>
                          <span className="flex items-center gap-1">
                            {getNotificationTypeIcon(notification.type)}
                            {notificationTypes.find(t => t.value === notification.type)?.label}
                          </span>
                        </Badge>
                        {!notification.isRead && (
                          <Badge variant="outline" className="bg-primary text-primary-foreground">
                            Mới
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold mb-1">{notification.title}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                        {notification.deviceName && (
                          <>
                            <Cpu className="h-3 w-3" />
                            <span className="truncate">{notification.deviceName}</span>
                            <span>·</span>
                          </>
                        )}
                        <Calendar className="h-3 w-3" />
                        <span>{formatRelativeTime(notification.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col gap-1">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            title="Đánh dấu đã đọc"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification.id);
                          }}
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
                          {notification.homeName && (
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-xs text-muted-foreground">Nhà</div>
                                <div className="font-medium">{notification.homeName}</div>
                              </div>
                            </div>
                          )}

                          {notification.deviceName && (
                            <div className="flex items-center gap-2">
                              <Cpu className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="text-xs text-muted-foreground">Thiết bị</div>
                                <div className="font-medium">{notification.deviceName}</div>
                                {notification.deviceCode && (
                                  <div className="text-xs text-muted-foreground">Code: {notification.deviceCode}</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Loại thông báo</div>
                            <Badge variant={getNotificationTypeBadgeVariant(notification.type)}>
                              {notificationTypes.find(t => t.value === notification.type)?.label}
                            </Badge>
                          </div>

                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Thời gian</div>
                            <div className="font-medium">{formatDateTime(notification.createdAt)}</div>
                            <div className="text-xs text-muted-foreground">{formatRelativeTime(notification.createdAt)}</div>
                          </div>
                        </div>
                      </div>

                      {notification.metadata && (
                        <div className="pt-2 border-t">
                          <div className="text-xs text-muted-foreground mb-2">Chi tiết</div>
                          <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto">
                            <pre className="whitespace-pre-wrap break-words">
                              {(() => {
                                try {
                                  const parsed = JSON.parse(notification.metadata!);
                                  return JSON.stringify(parsed, null, 2);
                                } catch {
                                  return notification.metadata;
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
            {' '}· Tổng <span className="font-medium">{totalElements}</span> thông báo
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
