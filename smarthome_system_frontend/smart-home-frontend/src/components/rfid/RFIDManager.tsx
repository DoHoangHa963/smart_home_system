import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useHomeStore } from '@/store/homeStore';
import { rfidApi } from '@/lib/api/mcu.api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  CreditCard,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldX,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import type { RFIDCard, RFIDLearnStatusResponse, RFIDAccessLog, RFIDAccessStats } from '@/types/rfid';
import { webSocketService } from '@/lib/websocket';

interface RFIDManagerProps {
  homeId?: number;
}

export default function RFIDManager({ homeId: propHomeId }: RFIDManagerProps) {
  const { currentHome } = useHomeStore();
  const homeId = propHomeId || currentHome?.id;

  // State
  const [cards, setCards] = useState<RFIDCard[]>([]);
  const [maxCards, setMaxCards] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [isLearning, setIsLearning] = useState(false);
  const [learningStatus, setLearningStatus] = useState<RFIDLearnStatusResponse | null>(null);
  const [newCardName, setNewCardName] = useState('');
  const [editingCard, setEditingCard] = useState<RFIDCard | null>(null);
  const [editCardName, setEditCardName] = useState('');
  const [accessLogs, setAccessLogs] = useState<RFIDAccessLog[]>([]);
  const [accessStats, setAccessStats] = useState<RFIDAccessStats | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const learningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch cards list
  const fetchCards = useCallback(async () => {
    if (!homeId) return;

    setIsLoading(true);
    try {
      const response = await rfidApi.getCardsList(homeId);
      setCards(response.cards);
      setMaxCards(response.maxCards);
      if (response.learningMode) {
        setIsLearning(true);
      }
    } catch (error: any) {
      console.error('Failed to fetch RFID cards:', error);
      toast.error('Không thể tải danh sách thẻ RFID');
    } finally {
      setIsLoading(false);
    }
  }, [homeId]);

  // Fetch access logs
  const fetchAccessLogs = useCallback(async () => {
    if (!homeId) return;

    try {
      const logs = await rfidApi.getRecentAccessLogs(homeId);
      setAccessLogs(logs);
    } catch (error: any) {
      console.error('Failed to fetch access logs:', error);
    }
  }, [homeId]);

  // Fetch access stats
  const fetchAccessStats = useCallback(async () => {
    if (!homeId) return;

    try {
      const stats = await rfidApi.getAccessStats(homeId);
      setAccessStats(stats);
    } catch (error: any) {
      console.error('Failed to fetch access stats:', error);
    }
  }, [homeId]);

  // Initial data load
  useEffect(() => {
    if (homeId) {
      fetchCards();
      fetchAccessLogs();
      fetchAccessStats();
    }
  }, [homeId, fetchCards, fetchAccessLogs, fetchAccessStats]);

  // WebSocket Subscriptions
  useEffect(() => {
    if (!homeId) return;

    webSocketService.activate();

    // 1. Subscribe to Learning Status
    const learnSubId = webSocketService.subscribe(`/topic/home/${homeId}/rfid/learn/status`, (message) => {
      try {
        const status = typeof message === 'string' ? JSON.parse(message) : message;
        setLearningStatus(status);

        if (!status.learningMode) {
          setIsLearning(false);
        }

        if (status.complete) {
          setIsLearning(false);
          // Clear timeout if learning completes
          if (learningTimeoutRef.current) {
            clearTimeout(learningTimeoutRef.current);
            learningTimeoutRef.current = null;
          }
          if (status.success) {
            toast.success('Thêm thẻ thành công!');
            // Wait a bit then refresh list (or rely on card update topic)
            fetchCards();
          } else {
            toast.error(status.result || 'Không thể thêm thẻ');
          }
        }
      } catch (e) {
        console.error('Error parsing learning status', e);
      }
    });

    // 2. Subscribe to Card Updates (if backend broadcasts list updates)
    // Even if backend doesn't broadcast list changes automatically on add/delete yet, 
    // we can listen for specific events or just rely on manual refresh/actions.
    // However, based on backend bridge, it sends to /topic/home/{homeId}/rfid/cards
    const cardsSubId = webSocketService.subscribe(`/topic/home/${homeId}/rfid/cards`, (message) => {
      // Optionally handle full list update if payload is the list
      // For now, if we receive a message here, we can trigger a fetch
      console.log('Received card update signal', message);
      fetchCards();
    });

    // 3. Subscribe to Access Logs
    const accessSubId = webSocketService.subscribe(`/topic/home/${homeId}/rfid/access`, (message) => {
      try {
        const logData = typeof message === 'string' ? JSON.parse(message) : message;
        // Assuming logData matches RFIDAccessLog structure or close to it
        // Backend sends the payload received from MQTT, which is:
        // { cardUid: "...", authorized: true, ... }
        // We might need to map this or just trust it contains enough info

        const isAuthorized = logData.authorized;
        if (isAuthorized) {
          toast.success(`Thẻ ${logData.cardName || logData.cardUid || 'Unknown'} - Truy cập được chấp nhận`);
        } else {
          toast.error(`Thẻ ${logData.cardUid || 'Unknown'} - Truy cập bị từ chối`);
        }

        // Refresh logs and stats
        fetchAccessLogs();
        fetchAccessStats();
      } catch (e) {
        console.error('Error parsing access log', e);
      }
    });

    return () => {
      webSocketService.unsubscribe(learnSubId);
      webSocketService.unsubscribe(cardsSubId);
      webSocketService.unsubscribe(accessSubId);
      // Clear timeout on unmount
      if (learningTimeoutRef.current) {
        clearTimeout(learningTimeoutRef.current);
        learningTimeoutRef.current = null;
      }
    };
  }, [homeId, fetchCards]);

  // Start learning mode
  const handleStartLearning = async () => {
    if (!homeId) return;

    if (cards.length >= maxCards) {
      toast.error(`Đã đạt giới hạn ${maxCards} thẻ`);
      return;
    }

    try {
      const response = await rfidApi.startLearning(homeId, {
        name: newCardName || undefined
      });
      setIsLearning(true);
      setLearningStatus(response);
      setNewCardName('');
      toast.info('Đặt thẻ lên đầu đọc trong vòng 10 giây...');
      
      // Clear any existing timeout
      if (learningTimeoutRef.current) {
        clearTimeout(learningTimeoutRef.current);
      }
      
      // Set timeout to stop learning mode if no response after 15 seconds
      // This prevents infinite loading if WebSocket fails
      learningTimeoutRef.current = setTimeout(async () => {
        // Check if still in learning mode
        const currentStatus = await rfidApi.getLearningStatus(homeId).catch(() => null);
        if (currentStatus) {
          setLearningStatus(currentStatus);
          if (currentStatus.complete) {
            setIsLearning(false);
            if (currentStatus.success) {
              toast.success('Thêm thẻ thành công!');
              fetchCards();
            } else {
              toast.error(currentStatus.result || 'Không thể thêm thẻ');
            }
          } else {
            // Still learning but timeout - show warning
            setIsLearning(false);
            toast.warning('Hết thời gian chờ. Vui lòng kiểm tra lại trạng thái.');
          }
        } else {
          setIsLearning(false);
          toast.warning('Không thể kiểm tra trạng thái. Vui lòng thử lại.');
        }
        learningTimeoutRef.current = null;
      }, 15000); // 15 seconds timeout
    } catch (error: any) {
      console.error('Failed to start learning:', error);
      toast.error('Không thể bắt đầu chế độ học thẻ');
    }
  };

  // Update card
  const handleUpdateCard = async () => {
    if (!homeId || !editingCard) return;

    try {
      await rfidApi.updateCard(homeId, {
        index: editingCard.index,
        name: editCardName,
        enabled: editingCard.enabled,
      });
      toast.success('Cập nhật thẻ thành công');
      setEditingCard(null);
      fetchCards();
    } catch (error: any) {
      console.error('Failed to update card:', error);
      toast.error('Không thể cập nhật thẻ');
    }
  };

  // Toggle card enabled
  const handleToggleEnabled = async (card: RFIDCard) => {
    if (!homeId) return;

    try {
      await rfidApi.updateCard(homeId, {
        index: card.index,
        enabled: !card.enabled,
      });
      fetchCards();
    } catch (error: any) {
      console.error('Failed to toggle card:', error);
      toast.error('Không thể thay đổi trạng thái thẻ');
    }
  };

  // Delete card
  const handleDeleteCard = async (index: number) => {
    if (!homeId) return;

    try {
      await rfidApi.deleteCard(homeId, index);
      toast.success('Xóa thẻ thành công');
      setShowDeleteConfirm(null);
      fetchCards();
    } catch (error: any) {
      console.error('Failed to delete card:', error);
      toast.error('Không thể xóa thẻ');
    }
  };

  // Clear all cards
  const handleClearAll = async () => {
    if (!homeId) return;

    try {
      await rfidApi.clearAllCards(homeId);
      toast.success('Đã xóa tất cả thẻ');
      setShowClearConfirm(false);
      fetchCards();
    } catch (error: any) {
      console.error('Failed to clear cards:', error);
      toast.error('Không thể xóa thẻ');
    }
  };

  // Format timestamp
  const formatTime = (timestamp?: number | string) => {
    if (!timestamp) return '-';
    const date = typeof timestamp === 'string' ? new Date(timestamp) : new Date(timestamp);
    return date.toLocaleString('vi-VN');
  };

  if (!homeId) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Vui lòng chọn một nhà để quản lý thẻ RFID
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="cards" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cards">
            <CreditCard className="w-4 h-4 mr-2" />
            Thẻ RFID ({cards.length}/{maxCards})
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Clock className="w-4 h-4 mr-2" />
            Lịch sử truy cập
          </TabsTrigger>
        </TabsList>

        {/* Cards Tab */}
        <TabsContent value="cards" className="space-y-4">
          {/* Add Card Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Thêm thẻ mới
              </CardTitle>
              <CardDescription>
                Đặt thẻ RFID lên đầu đọc để đăng ký
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLearning ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">Đang chờ thẻ...</p>
                  <p className="text-sm text-muted-foreground">
                    {learningStatus?.result || 'Đặt thẻ lên đầu đọc trong vòng 10 giây'}
                  </p>
                </div>
              ) : (
                <div className="flex gap-4">
                  <Input
                    placeholder="Tên thẻ (tùy chọn)"
                    value={newCardName}
                    onChange={(e) => setNewCardName(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleStartLearning}
                    disabled={cards.length >= maxCards}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm thẻ
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cards List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Danh sách thẻ</CardTitle>
                <CardDescription>
                  {cards.length} thẻ đã đăng ký
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchCards}
                  disabled={isLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Làm mới
                </Button>
                {cards.length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowClearConfirm(true)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Xóa tất cả
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : cards.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Chưa có thẻ nào được đăng ký</p>
                  <p className="text-sm">Thêm thẻ mới bằng cách nhấn nút "Thêm thẻ"</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">#</TableHead>
                      <TableHead>UID</TableHead>
                      <TableHead>Tên</TableHead>
                      <TableHead className="w-[100px]">Trạng thái</TableHead>
                      <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cards.map((card) => (
                      <TableRow key={card.index}>
                        <TableCell className="font-medium">{card.index + 1}</TableCell>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded text-sm">
                            {card.uid}
                          </code>
                        </TableCell>
                        <TableCell>{card.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={card.enabled}
                              onCheckedChange={() => handleToggleEnabled(card)}
                            />
                            <Badge variant={card.enabled ? 'default' : 'secondary'}>
                              {card.enabled ? 'Hoạt động' : 'Tắt'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingCard(card);
                                setEditCardName(card.name);
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setShowDeleteConfirm(card.index)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Access Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          {/* Stats */}
          {accessStats && (
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Tổng truy cập</p>
                      <p className="text-2xl font-bold">{accessStats.totalAccess}</p>
                    </div>
                    <Shield className="w-8 h-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Được phép</p>
                      <p className="text-2xl font-bold text-green-600">
                        {accessStats.authorizedCount}
                      </p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Bị từ chối</p>
                      <p className="text-2xl font-bold text-red-600">
                        {accessStats.unauthorizedCount}
                      </p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Logs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Lịch sử truy cập gần đây</CardTitle>
                <CardDescription>10 lần quét thẻ gần nhất</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchAccessLogs();
                  fetchAccessStats();
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Làm mới
              </Button>
            </CardHeader>
            <CardContent>
              {accessLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Chưa có lịch sử truy cập</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Thời gian</TableHead>
                      <TableHead>Thẻ</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Kết quả</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accessLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {formatTime(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <code className="bg-muted px-2 py-0.5 rounded text-xs">
                              {log.cardUid}
                            </code>
                            {log.cardName && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {log.cardName}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.status === 'KNOWN' ? 'default' :
                                log.status === 'DISABLED' ? 'secondary' : 'destructive'
                            }
                          >
                            {log.status === 'KNOWN' ? 'Đã đăng ký' :
                              log.status === 'DISABLED' ? 'Bị vô hiệu' : 'Không xác định'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.authorized ? (
                            <div className="flex items-center gap-2 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span>Được phép</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-red-600">
                              <XCircle className="w-4 h-4" />
                              <span>Từ chối</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Card Dialog */}
      <Dialog open={!!editingCard} onOpenChange={() => setEditingCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thẻ</DialogTitle>
            <DialogDescription>
              Thay đổi tên hoặc trạng thái của thẻ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">UID</label>
              <code className="block bg-muted px-3 py-2 rounded mt-1">
                {editingCard?.uid}
              </code>
            </div>
            <div>
              <label className="text-sm font-medium">Tên thẻ</label>
              <Input
                value={editCardName}
                onChange={(e) => setEditCardName(e.target.value)}
                placeholder="Nhập tên thẻ"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCard(null)}>
              Hủy
            </Button>
            <Button onClick={handleUpdateCard}>
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm !== null} onOpenChange={() => setShowDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa thẻ</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa thẻ này? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm !== null && handleDeleteCard(showDeleteConfirm)}
            >
              Xóa thẻ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Confirmation Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa tất cả thẻ</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa tất cả {cards.length} thẻ? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleClearAll}>
              Xóa tất cả
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
