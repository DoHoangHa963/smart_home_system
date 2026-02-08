/**
 * Home Entry Dialog Component
 * 
 * Shows options when entering a home:
 * - If MCU is connected: Go directly to dashboard
 * - If MCU is not connected: Show options to setup MCU or skip to dashboard
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { mcuApi } from '@/lib/api/mcu.api';
import { useAuthStore } from '@/store/authStore';
import { usePermission } from '@/hooks/usePermission';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Cpu, 
  Home as HomeIcon, 
  ArrowRight, 
  Wifi, 
  WifiOff,
  Settings,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import type { MCUGateway } from '@/types/mcu';
import type { Home } from '@/types/home';

interface HomeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  home: Home | null;
  onProceed: () => void;
}

export default function HomeEntryDialog({ 
  open, 
  onOpenChange, 
  home,
  onProceed 
}: HomeEntryDialogProps) {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isAdmin } = usePermission();
  const [isLoading, setIsLoading] = useState(true);
  const [mcuInfo, setMcuInfo] = useState<MCUGateway | null>(null);
  const [hasMCU, setHasMCU] = useState<boolean | null>(null);

  // Kiểm tra xem user có phải owner của home không
  const isOwner = home?.ownerId === user?.id;
  const canViewMCU = isAdmin || isOwner;

  useEffect(() => {
    if (open && home && canViewMCU) {
      checkMCUStatus();
    } else if (open && home && !canViewMCU) {
      // Nếu không phải owner/admin, không check MCU
      setIsLoading(false);
      setHasMCU(null);
    }
  }, [open, home, canViewMCU]);

  const checkMCUStatus = async () => {
    if (!home) return;
    
    setIsLoading(true);
    try {
      const response = await mcuApi.getByHomeId(home.id);
      if (response && response.data) {
        setMcuInfo(response.data);
        setHasMCU(true);
      } else {
        setMcuInfo(null);
        setHasMCU(false);
      }
    } catch (error) {
      setMcuInfo(null);
      setHasMCU(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    onOpenChange(false);
    onProceed();
  };

  const handleSetupMCU = () => {
    onOpenChange(false);
    navigate(`/mcu/setup?homeId=${home?.id}`);
  };

  if (!home) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HomeIcon className="h-5 w-5 text-primary" />
            {home.name}
          </DialogTitle>
          <DialogDescription>
            Chọn cách bạn muốn truy cập vào nhà này
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground mt-2">
              Đang kiểm tra trạng thái MCU...
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {/* MCU Status Card - Chỉ hiển thị cho owner hoặc admin */}
            {canViewMCU && (
              <>
                <div className={`p-4 rounded-lg border ${
                  hasMCU 
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                    : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      hasMCU 
                        ? 'bg-green-100 dark:bg-green-900/30' 
                        : 'bg-amber-100 dark:bg-amber-900/30'
                    }`}>
                      {hasMCU ? (
                        <Wifi className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <WifiOff className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${
                          hasMCU 
                            ? 'text-green-700 dark:text-green-300' 
                            : 'text-amber-700 dark:text-amber-300'
                        }`}>
                          {hasMCU ? 'MCU Gateway đã kết nối' : 'Chưa có MCU Gateway'}
                        </span>
                        {mcuInfo && (
                          <Badge 
                            variant={mcuInfo.isOnline ? 'default' : 'secondary'}
                            className={mcuInfo.isOnline ? 'bg-green-500' : ''}
                          >
                            {mcuInfo.isOnline ? 'Online' : 'Offline'}
                          </Badge>
                        )}
                      </div>
                      {mcuInfo ? (
                        <p className="text-sm text-muted-foreground mt-1">
                          {mcuInfo.name} • {mcuInfo.serialNumber}
                        </p>
                      ) : (
                        <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                          Kết nối MCU để điều khiển thiết bị IoT
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Warning for no MCU */}
                {!hasMCU && (
                  <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">
                      Bạn vẫn có thể vào Dashboard để quản lý nhà, phòng và thành viên. 
                      Tuy nhiên, cần MCU Gateway để điều khiển thiết bị IoT.
                    </p>
                  </div>
                )}

                <Separator />
              </>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button 
                className="w-full justify-between" 
                size="lg"
                onClick={handleGoToDashboard}
              >
                <span className="flex items-center gap-2">
                  <HomeIcon className="h-4 w-4" />
                  Vào Dashboard
                </span>
                <ArrowRight className="h-4 w-4" />
              </Button>

              {/* MCU Setup/Management buttons - Chỉ hiển thị cho owner hoặc admin */}
              {canViewMCU && (
                <>
                  {!hasMCU && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-between" 
                      size="lg"
                      onClick={handleSetupMCU}
                    >
                      <span className="flex items-center gap-2">
                        <Cpu className="h-4 w-4" />
                        Thiết lập MCU Gateway
                      </span>
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}

                  {hasMCU && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-between" 
                      size="lg"
                      onClick={handleSetupMCU}
                    >
                      <span className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Quản lý MCU Gateway
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
