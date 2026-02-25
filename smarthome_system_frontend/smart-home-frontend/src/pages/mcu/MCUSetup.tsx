/**
 * MCU Gateway Setup Page
 *
 * Chỉ cần nhập mã SN (Serial Number), hệ thống tự động kết nối (init + confirm pairing).
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useHomeStore } from '@/store/homeStore';
import { usePermission } from '@/hooks/usePermission';
import { HOME_PERMISSIONS } from '@/types/permission';
import { mcuApi } from '@/lib/api/mcu.api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Cpu,
  Link2,
  Home as HomeIcon,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
  Unlink,
  QrCode,
  Signal,
  Edit,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { MCUGateway, MCUPairingInitResponse } from '@/types/mcu';

/**
 * Component to send API Key directly to ESP32
 */
interface SendApiKeyToESP32Props {
  apiKey: string;
  mcuGatewayId: number;
  homeId: number;
  defaultIpAddress?: string;
}

function SendApiKeyToESP32({ apiKey, mcuGatewayId, homeId, defaultIpAddress }: SendApiKeyToESP32Props) {
  const [esp32IpAddress, setEsp32IpAddress] = useState(defaultIpAddress || '');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const handleSendApiKey = async () => {
    if (!esp32IpAddress.trim()) {
      toast.error('Vui lòng nhập địa chỉ IP của ESP32');
      return;
    }

    setIsSending(true);
    try {
      // Gửi API Key đến ESP32 thông qua backend proxy để tránh CORS
      await mcuApi.sendApiKeyToESP32(
        esp32IpAddress.trim(),
        apiKey,
        mcuGatewayId,
        homeId
      );

      setSendSuccess(true);
      toast.success('Đã gửi API Key đến ESP32 thành công!');
    } catch (error: any) {
      console.error('Error sending API key to ESP32:', error);
      const errorMsg = error.response?.data?.message ||
        'Lỗi kết nối: Đảm bảo bạn đang trong cùng mạng WiFi với ESP32';
      toast.error(errorMsg);
    } finally {
      setIsSending(false);
    }
  };

  if (sendSuccess) {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex gap-3 items-center">
          <Check className="h-5 w-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800 dark:text-green-200">
              ESP32 đã được cấu hình!
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              Thiết bị sẽ bắt đầu gửi heartbeat trong giây lát.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex gap-3">
          <Wifi className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-200">
              Gửi API Key tự động đến ESP32
            </p>
            <p className="text-blue-700 dark:text-blue-300 mt-1">
              Nhập địa chỉ IP của ESP32 (hiển thị trên LCD) để tự động cấu hình.
              Đảm bảo điện thoại đang kết nối cùng WiFi với ESP32.
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="VD: 192.168.1.100"
          value={esp32IpAddress}
          onChange={(e) => setEsp32IpAddress(e.target.value)}
          className="flex-1"
        />
        <Button
          onClick={handleSendApiKey}
          disabled={isSending || !esp32IpAddress.trim()}
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Signal className="h-4 w-4" />
          )}
          <span className="ml-2">Gửi</span>
        </Button>
      </div>
    </div>
  );
}

type SetupStep = 'check' | 'input' | 'success';

export default function MCUSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const homeIdParam = searchParams.get('homeId');

  const { currentHome } = useHomeStore();
  const { isOwner, isOwnerOrAdmin, isAdmin, can } = usePermission();

  // Permission checks
  const canManageMCU = isAdmin || isOwner; // Pair/Unpair/Edit IP - only owner or admin
  const canViewMCU = isAdmin || isOwnerOrAdmin || can(HOME_PERMISSIONS.HOME_SETTINGS_VIEW);
  const [step, setStep] = useState<SetupStep>('check');
  const [isLoading, setIsLoading] = useState(false);
  const [existingMCU, setExistingMCU] = useState<MCUGateway | null>(null);
  const [homeName, setHomeName] = useState<string>('');

  // Chỉ cần mã SN
  const [mcuName, setMcuName] = useState('');
  const [ipAddress, setIpAddress] = useState('');
  const [firmwareVersion, setFirmwareVersion] = useState('');

  // Pairing state
  const [pairingResponse, setPairingResponse] = useState<MCUPairingInitResponse | null>(null);
  const [serialNumber, setSerialNumber] = useState('');
  const [apiKey, setApiKey] = useState<string | null>(null);

  // IP Address edit state
  const [isEditingIP, setIsEditingIP] = useState(false);
  const [newIPAddress, setNewIPAddress] = useState('');
  const [isUpdatingIP, setIsUpdatingIP] = useState(false);

  const homeId = homeIdParam ? parseInt(homeIdParam) : currentHome?.id;

  useEffect(() => {
    if (homeId) {
      checkExistingMCU();
    }
    // Set home name from currentHome or existing MCU response
    if (currentHome?.name) {
      setHomeName(currentHome.name);
    }
  }, [homeId, currentHome]);

  // Auto-refresh MCU status every 30 seconds when MCU exists
  useEffect(() => {
    if (!existingMCU || step !== 'check') return;

    const interval = setInterval(() => {
      checkExistingMCU();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [existingMCU, step]);

  const checkExistingMCU = async () => {
    if (!homeId) return;

    setIsLoading(true);
    try {
      const response = await mcuApi.getByHomeId(homeId);
      if (response && response.data) {
        setExistingMCU(response.data);
        // Set home name from MCU response if not already set
        if (!homeName && response.data.homeName) {
          setHomeName(response.data.homeName);
        }
        setStep('check');
      } else {
        setExistingMCU(null);
        setStep('input');
      }
    } catch (error) {
      setExistingMCU(null);
      setStep('input');
    } finally {
      setIsLoading(false);
    }
  };

  /** Chỉ nhập SN → tự động init pairing + confirm (kết nối ngay) */
  const handleConnectBySN = async () => {
    if (!serialNumber.trim()) {
      toast.error('Vui lòng nhập Serial Number của MCU');
      return;
    }
    if (!homeId) {
      toast.error('Không tìm thấy Home. Vui lòng chọn Home trước.');
      return;
    }

    setIsLoading(true);
    setApiKey(null);
    try {
      const initRes = await mcuApi.initPairing({
        serialNumber: serialNumber.trim(),
        homeId,
      });
      const confirmRes = await mcuApi.confirmPairing(initRes.data.mcuGatewayId, homeId);
      if (confirmRes.data?.apiKey) {
        setApiKey(confirmRes.data.apiKey);
      }
      setPairingResponse(initRes.data);
      await checkExistingMCU();
      setStep('success');
      toast.success('Kết nối MCU Gateway thành công!');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Không thể kết nối MCU. Kiểm tra lại mã SN và thử lại.';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnpair = async () => {
    if (!existingMCU) return;

    setIsLoading(true);
    try {
      await mcuApi.unpair(existingMCU.id);
      setExistingMCU(null);
      setStep('input');
      toast.success('Đã gỡ MCU Gateway ra khỏi nhà thành công');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Không thể gỡ MCU Gateway';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const goToDashboard = () => {
    navigate('/dashboard', { replace: true });
  };

  const handleUpdateIPAddress = async () => {
    if (!existingMCU) return;

    if (!newIPAddress.trim()) {
      toast.error('Vui lòng nhập địa chỉ IP');
      return;
    }

    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(newIPAddress.trim())) {
      toast.error('Địa chỉ IP không hợp lệ');
      return;
    }

    setIsUpdatingIP(true);
    try {
      await mcuApi.updateIPAddress(existingMCU.id, newIPAddress.trim());
      toast.success('Đã cập nhật IP Address thành công');
      setIsEditingIP(false);
      setNewIPAddress('');
      // Refresh MCU info
      await checkExistingMCU();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || 'Không thể cập nhật IP Address';
      toast.error(errorMsg);
    } finally {
      setIsUpdatingIP(false);
    }
  };

  const getStatusBadge = (status: string, isOnline: boolean) => {
    if (isOnline) {
      return <Badge className="bg-green-500 text-white">Online</Badge>;
    }
    switch (status) {
      case 'PAIRING':
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600">Đang kết nối</Badge>;
      case 'ONLINE':
        return <Badge className="bg-green-500 text-white">Online</Badge>;
      case 'OFFLINE':
        return <Badge variant="secondary">Offline</Badge>;
      case 'ERROR':
        return <Badge variant="destructive">Lỗi</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Loading state
  if (isLoading && step === 'check') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Đang kiểm tra kết nối MCU...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Thiết lập MCU Gateway</h1>
            <p className="text-muted-foreground">
              {homeName || currentHome?.name || 'Kết nối ESP32 với hệ thống'}
            </p>
          </div>
        </div>

        {/* Existing MCU Info */}
        {existingMCU && step === 'check' && (
          <Card className="border-green-500/30 bg-gradient-to-br from-green-50/50 to-white dark:from-green-950/20 dark:to-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Cpu className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{existingMCU.name}</CardTitle>
                    <CardDescription>
                      {existingMCU.serialNumber}
                    </CardDescription>
                  </div>
                </div>
                {getStatusBadge(existingMCU.status, existingMCU.isOnline)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">IP Address</p>
                    {canManageMCU && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={() => {
                          setNewIPAddress(existingMCU.ipAddress || '');
                          setIsEditingIP(true);
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="font-medium">{existingMCU.ipAddress || 'Chưa có'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Firmware</p>
                  <p className="font-medium">{existingMCU.firmwareVersion || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Kết nối lúc</p>
                  <p className="font-medium">
                    {existingMCU.pairedAt
                      ? new Date(existingMCU.pairedAt).toLocaleDateString('vi-VN')
                      : 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Heartbeat cuối</p>
                  <p className="font-medium">
                    {existingMCU.lastHeartbeat
                      ? new Date(existingMCU.lastHeartbeat).toLocaleString('vi-VN')
                      : existingMCU.status === 'PAIRING'
                        ? 'Chưa có (đang ghép nối)'
                        : 'Chưa có (chưa nhận API Key)'}
                  </p>
                </div>
              </div>

              {/* Warning nếu MCU đã pair nhưng chưa online */}
              {existingMCU.status !== 'PAIRING' && !existingMCU.isOnline && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                        MCU Gateway chưa kết nối
                      </p>
                      <p className="text-yellow-700 dark:text-yellow-300">
                        {!existingMCU.lastHeartbeat
                          ? 'ESP32 chưa gửi heartbeat. Đảm bảo ESP32 đã nhận API Key và đang kết nối WiFi.'
                          : 'ESP32 đã mất kết nối. Kiểm tra thiết bị và kết nối WiFi.'}
                      </p>
                      {!existingMCU.ipAddress && (
                        <p className="text-yellow-700 dark:text-yellow-300 mt-1 text-xs">
                          💡 Tip: Nếu ESP32 đã có IP (hiển thị trên LCD), bạn có thể gửi API Key thủ công qua trang này.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={checkExistingMCU}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Làm mới
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    {canManageMCU && (
                      <Button
                        variant="destructive"
                        className="flex-1"
                        disabled={isLoading}
                      >
                        <Unlink className="h-4 w-4 mr-2" />
                        Gỡ MCU
                      </Button>
                    )}
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        Xác nhận gỡ MCU Gateway
                      </AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="space-y-3 pt-2">
                          <div>
                            <p className="font-medium text-foreground mb-2">
                              Bạn có chắc chắn muốn gỡ MCU Gateway này không?
                            </p>

                            {/* Thông tin MCU sẽ bị gỡ */}
                            {existingMCU && (
                              <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm mt-3">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Tên MCU:</span>
                                  <span className="font-medium">{existingMCU.name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Serial Number:</span>
                                  <span className="font-mono text-xs">{existingMCU.serialNumber}</span>
                                </div>
                                {existingMCU.ipAddress && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">IP Address:</span>
                                    <span className="font-medium">{existingMCU.ipAddress}</span>
                                  </div>
                                )}
                                {existingMCU.homeName && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Nhà:</span>
                                    <span className="font-medium">{existingMCU.homeName}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="pt-2 border-t">
                            <p className="font-medium text-foreground mb-2">Hành động này sẽ:</p>
                            <ul className="list-disc list-inside space-y-1.5 text-sm">
                              <li>Xóa hoàn toàn MCU Gateway khỏi database</li>
                              <li>ESP32 sẽ không thể kết nối với backend nữa</li>
                              <li>API Key sẽ bị vô hiệu hóa</li>
                              <li>Bạn có thể pair MCU mới cho Home này sau khi gỡ</li>
                            </ul>
                          </div>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isLoading}>Hủy</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleUnpair}
                        disabled={isLoading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Đang xử lý...
                          </>
                        ) : (
                          <>
                            <Unlink className="h-4 w-4 mr-2" />
                            Xác nhận gỡ
                          </>
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={goToDashboard}
              >
                <HomeIcon className="h-4 w-4 mr-2" />
                Vào Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No permission notice for members */}
        {step === 'input' && !canManageMCU && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="font-semibold text-lg">Chưa có MCU Gateway</h3>
                  <p className="text-muted-foreground mt-1">
                    Nhà này chưa được kết nối với MCU Gateway. Vui lòng liên hệ chủ nhà để thiết lập.
                  </p>
                </div>
                <Button variant="outline" onClick={() => navigate(-1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Quay lại
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chỉ nhập SN → Kết nối tự động - Only visible to owner/admin */}
        {step === 'input' && canManageMCU && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <QrCode className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Nhập mã SN MCU</CardTitle>
                  <CardDescription>
                    Nhập Serial Number từ thiết bị ESP32, hệ thống sẽ tự động kết nối
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number *</Label>
                <Input
                  id="serialNumber"
                  placeholder="VD: ESP32_ABC123..."
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConnectBySN()}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Tìm Serial Number trên thiết bị hoặc trong ứng dụng ESP32
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mcuName">Tên hiển thị</Label>
                <Input
                  id="mcuName"
                  placeholder="VD: MCU Phòng khách"
                  value={mcuName}
                  onChange={(e) => setMcuName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ipAddress">IP Address</Label>
                  <Input
                    id="ipAddress"
                    placeholder="192.168.1.x"
                    value={ipAddress}
                    onChange={(e) => setIpAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firmware">Firmware Version</Label>
                  <Input
                    id="firmware"
                    placeholder="v1.0.0"
                    value={firmwareVersion}
                    onChange={(e) => setFirmwareVersion(e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="flex-1"
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Quay lại
                </Button>
                <Button
                  onClick={handleConnectBySN}
                  disabled={isLoading || !serialNumber.trim()}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Đang kết nối...
                    </>
                  ) : (
                    <>
                      <Signal className="h-4 w-4 mr-2" />
                      Kết nối
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success */}
        {step === 'success' && (
          <Card className="border-green-500/30">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-green-700 dark:text-green-400">
                Kết nối thành công!
              </CardTitle>
              <CardDescription>
                MCU Gateway đã được kết nối với nhà của bạn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {apiKey && (
                <>
                  {/* Send API Key to ESP32 */}
                  <SendApiKeyToESP32
                    apiKey={apiKey}
                    mcuGatewayId={pairingResponse?.mcuGatewayId || existingMCU?.id || 0}
                    homeId={homeId || 0}
                    defaultIpAddress={ipAddress}
                  />

                  <Separator />

                  {/* Manual API Key display */}
                  <div className="space-y-2">
                    <Label>API Key (chỉ hiển thị một lần)</Label>
                    <div className="p-3 bg-muted rounded-lg font-mono text-xs break-all select-all">
                      {apiKey}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Hoặc sao chép API Key này để cấu hình thủ công cho ESP32
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(apiKey);
                        toast.success('Đã sao chép API Key');
                      }}
                    >
                      Sao chép API Key
                    </Button>
                  </div>
                  <Separator />
                </>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={goToDashboard}
              >
                <HomeIcon className="h-4 w-4 mr-2" />
                Vào Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info Section */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Signal className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">MCU Gateway là gì?</p>
                <p>
                  MCU Gateway (ESP32) là thiết bị trung gian giúp kết nối và điều khiển
                  các thiết bị IoT trong nhà thông minh của bạn với hệ thống cloud.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* IP Address Edit Dialog */}
      <AlertDialog open={isEditingIP} onOpenChange={setIsEditingIP}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cập nhật IP Address</AlertDialogTitle>
            <AlertDialogDescription>
              Nhập địa chỉ IP mới của ESP32 MCU Gateway
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="192.168.x.x"
              value={newIPAddress}
              onChange={(e) => setNewIPAddress(e.target.value)}
              disabled={isUpdatingIP}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdatingIP}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleUpdateIPAddress();
              }}
              disabled={isUpdatingIP}
            >
              {isUpdatingIP && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Cập nhật
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
