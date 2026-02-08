import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Zap, Lightbulb, Fan, DoorOpen, Thermometer, Sun, CloudRain,
    RefreshCw, WifiOff, Settings2, Activity, Move, AlertCircle, Save
} from 'lucide-react';
import { useHomeStore } from '@/store/homeStore';
import { usePermission } from '@/hooks/usePermission';
import { mcuApi, MCUOnlineStatus } from '@/lib/api/mcu.api';
import { HOME_PERMISSIONS } from '@/types/permission';
import { toast } from 'sonner';
import { webSocketService } from '@/lib/websocket';

// Automation configuration from ESP32
interface AutomationConfig {
    autoLightEnabled: boolean;
    autoFanEnabled: boolean;
    autoCloseDoorEnabled: boolean;
    autoLightThreshold: number;
    autoFanThreshold: number;
    gasAlertThreshold: number;
    timestamp?: number;
}

// Card component for each automation rule
interface AutomationCardProps {
    title: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
    loading: boolean;
    icon: React.ReactNode;
    iconBgColor: string;
    triggerInfo: string;
    threshold?: number;
    thresholdLabel?: string;
    disabled?: boolean;
}

const AutomationCard = ({
    title,
    description,
    enabled,
    onToggle,
    loading,
    icon,
    iconBgColor,
    triggerInfo,
    threshold,
    thresholdLabel,
    disabled = false,
}: AutomationCardProps) => (
    <Card className={`transition-all hover:shadow-md ${disabled ? 'opacity-60' : ''}`}>
        <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
                <div className="flex gap-4">
                    <div className={`p-3 rounded-xl ${iconBgColor}`}>
                        {icon}
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{title}</h3>
                            <Badge variant={enabled ? 'default' : 'secondary'} className="text-xs">
                                {enabled ? 'Đang bật' : 'Đang tắt'}
                            </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Activity className="h-3 w-3" />
                            <span>{triggerInfo}</span>
                        </div>
                        {threshold !== undefined && thresholdLabel && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                <Settings2 className="h-3 w-3" />
                                <span>{thresholdLabel}: {threshold}</span>
                            </div>
                        )}
                    </div>
                </div>
                <Switch
                    checked={enabled}
                    onCheckedChange={onToggle}
                    disabled={loading || disabled}
                    className="data-[state=checked]:bg-primary"
                />
            </div>
        </CardContent>
    </Card>
);

export default function Automations() {
    const { currentHome } = useHomeStore();
    const { can } = usePermission();

    // State
    const [automationConfig, setAutomationConfig] = useState<AutomationConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTogglingLight, setIsTogglingLight] = useState(false);
    const [isTogglingFan, setIsTogglingFan] = useState(false);
    const [isTogglingDoor, setIsTogglingDoor] = useState(false);
    const [mcuStatus, setMcuStatus] = useState<MCUOnlineStatus | null>(null);

    // Threshold editing state
    const [editLightThreshold, setEditLightThreshold] = useState<number | string>('');
    const [editTempThreshold, setEditTempThreshold] = useState<number | string>('');
    const [editGasThreshold, setEditGasThreshold] = useState<number | string>('');
    const [isSavingConfig, setIsSavingConfig] = useState(false);

    // Input Handler: Clamp Max on Change
    const handleThresholdChange = (
        value: string,
        setter: (value: string | number) => void,
        max: number
    ) => {
        if (value === '') {
            setter('');
            return;
        }
        const numVal = parseInt(value);
        if (!isNaN(numVal)) {
            if (numVal > max) setter(max);
            else setter(value);
        } else {
            setter(value);
        }
    };

    // Input Handler: Clamp Min/Max on Blur
    const handleThresholdBlur = (
        value: string | number,
        setter: (value: string | number) => void,
        min: number,
        max: number
    ) => {
        if (value === '') return;
        let numVal = Number(value);
        if (isNaN(numVal)) return;

        if (numVal < min) setter(min);
        else if (numVal > max) setter(max);
    };

    // Sync edit fields with loaded config
    useEffect(() => {
        if (automationConfig) {
            setEditLightThreshold(automationConfig.autoLightThreshold);
            setEditTempThreshold(automationConfig.autoFanThreshold);
            setEditGasThreshold(automationConfig.gasAlertThreshold);
        }
    }, [automationConfig]);

    // Save threshold configuration
    const saveThresholds = async () => {
        if (!currentHome) return;

        // Validation
        const light = Number(editLightThreshold);
        const temp = Number(editTempThreshold);
        const gas = Number(editGasThreshold);

        if (editLightThreshold !== '' && (isNaN(light) || light < 0 || light > 4095)) {
            toast.error('Ngưỡng ánh sáng phải từ 0 đến 4095');
            return;
        }

        if (editTempThreshold !== '' && (isNaN(temp) || temp < 0 || temp > 100)) {
            toast.error('Ngưỡng nhiệt độ phải từ 0 đến 100°C');
            return;
        }

        if (editGasThreshold !== '' && (isNaN(gas) || gas < 0 || gas > 4095)) {
            toast.error('Ngưỡng Gas phải từ 0 đến 4095');
            return;
        }

        setIsSavingConfig(true);
        try {
            const lightVal = editLightThreshold !== '' ? light : null;
            const tempVal = editTempThreshold !== '' ? temp : null;
            const gasVal = editGasThreshold !== '' ? gas : null;

            await mcuApi.setAutomationConfig(currentHome.id, lightVal, tempVal, gasVal);
            toast.success('Đã lưu cấu hình ngưỡng kích hoạt');
        } catch (error) {
            console.error('[Automations] Failed to save thresholds:', error);
            toast.error('Không thể lưu cấu hình ngưỡng');
        } finally {
            setIsSavingConfig(false);
        }
    };

    // Check MCU status
    const checkMCUStatus = async () => {
        if (!currentHome) return;

        try {
            const status = await mcuApi.checkMCUOnlineStatus(currentHome.id);
            setMcuStatus(status);
        } catch (error) {
            console.error('[Automations] Failed to check MCU status:', error);
        }
    };

    // Load automation configuration (from sensor data which includes automation config)
    const loadAutomationConfig = async () => {
        if (!currentHome) return;

        setIsLoading(true);
        try {
            // First, trigger heartbeat to request ESP32 to send fresh sensor data
            // This ensures we get the latest automation config
            try {
                await mcuApi.triggerHeartbeat(currentHome.id);
                // Wait a bit for ESP32 to respond with new data via MQTT
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
                console.log('[Automations] Heartbeat trigger skipped, using cached data');
            }

            // Get sensor data which includes automation config
            const response = await mcuApi.getSensorDataByHomeId(currentHome.id);

            if (response?.data) {
                const sensorData = response.data;
                console.log('[Automations] Loaded sensor data with automation config:', {
                    autoLight: sensorData.autoLight,
                    autoFan: sensorData.autoFan,
                    autoCloseDoor: sensorData.autoCloseDoor,
                });

                // Extract automation config from sensor data if available
                setAutomationConfig({
                    autoLightEnabled: sensorData.autoLight ?? true,
                    autoFanEnabled: sensorData.autoFan ?? true,
                    autoCloseDoorEnabled: sensorData.autoCloseDoor ?? true,
                    autoLightThreshold: sensorData.autoLightThreshold ?? 500,
                    autoFanThreshold: sensorData.autoFanThreshold ?? 30,
                    gasAlertThreshold: sensorData.gasAlertThreshold ?? 1000,
                });
            } else {
                // Set default config if no data available
                console.log('[Automations] No sensor data, using defaults');
                setAutomationConfig({
                    autoLightEnabled: true,
                    autoFanEnabled: true,
                    autoCloseDoorEnabled: true,
                    autoLightThreshold: 500,
                    autoFanThreshold: 30,
                    gasAlertThreshold: 1000,
                });
            }
        } catch (error: any) {
            console.error('[Automations] Failed to load automation config:', error);
            if (error.response?.status !== 404) {
                toast.error('Không thể tải cấu hình tự động hóa');
            }
            // Set defaults on error
            setAutomationConfig({
                autoLightEnabled: true,
                autoFanEnabled: true,
                autoCloseDoorEnabled: true,
                autoLightThreshold: 500,
                autoFanThreshold: 30,
                gasAlertThreshold: 1000,
            });
        } finally {
            setIsLoading(false);
        }
    };

    // Toggle automation via MQTT command
    const toggleAutomation = async (
        automationType: 'AUTO_LIGHT' | 'AUTO_FAN' | 'AUTO_CLOSE_DOOR',
        enabled: boolean
    ) => {
        if (!currentHome) return;

        // Set loading state
        if (automationType === 'AUTO_LIGHT') setIsTogglingLight(true);
        if (automationType === 'AUTO_FAN') setIsTogglingFan(true);
        if (automationType === 'AUTO_CLOSE_DOOR') setIsTogglingDoor(true);

        try {
            // Send MQTT command via backend API
            await mcuApi.toggleAutomation(currentHome.id, automationType, enabled);

            // Optimistic update
            setAutomationConfig(prev => {
                if (!prev) return prev;

                if (automationType === 'AUTO_LIGHT') {
                    return { ...prev, autoLightEnabled: enabled };
                }
                if (automationType === 'AUTO_FAN') {
                    return { ...prev, autoFanEnabled: enabled };
                }
                if (automationType === 'AUTO_CLOSE_DOOR') {
                    return { ...prev, autoCloseDoorEnabled: enabled };
                }
                return prev;
            });

            toast.success(`Đã ${enabled ? 'bật' : 'tắt'} ${automationType === 'AUTO_LIGHT' ? 'tự động đèn' :
                automationType === 'AUTO_FAN' ? 'tự động quạt' :
                    'tự động đóng cửa'
                }`);
        } catch (error) {
            console.error('[Automations] Failed to toggle automation:', error);
            toast.error('Không thể thay đổi cấu hình tự động hóa');
        } finally {
            if (automationType === 'AUTO_LIGHT') setIsTogglingLight(false);
            if (automationType === 'AUTO_FAN') setIsTogglingFan(false);
            if (automationType === 'AUTO_CLOSE_DOOR') setIsTogglingDoor(false);
        }
    };

    // Initial load
    useEffect(() => {
        if (currentHome && can(HOME_PERMISSIONS.AUTOMATION_VIEW)) {
            checkMCUStatus();
            loadAutomationConfig();
        }
    }, [currentHome?.id]);

    // WebSocket subscription for real-time automation config updates
    useEffect(() => {
        if (!currentHome) return;

        webSocketService.activate();

        // Subscribe to automation config topic
        const configTopic = `/topic/home/${currentHome.id}/automation/config`;
        const configSubId = webSocketService.subscribe(configTopic, (message) => {
            console.log('[Automations] Received automation config update:', message);
            try {
                const config = typeof message === 'string' ? JSON.parse(message) : message;
                setAutomationConfig({
                    autoLightEnabled: config.autoLightEnabled ?? true,
                    autoFanEnabled: config.autoFanEnabled ?? true,
                    autoCloseDoorEnabled: config.autoCloseDoorEnabled ?? true,
                    autoLightThreshold: config.autoLightThreshold ?? 500,
                    autoFanThreshold: config.autoFanThreshold ?? 30,
                    gasAlertThreshold: config.gasAlertThreshold ?? 1000,
                    timestamp: config.timestamp,
                });
            } catch (e) {
                console.error('[Automations] Error parsing config message:', e);
            }
        });

        return () => {
            webSocketService.unsubscribe(configSubId);
        };
    }, [currentHome?.id]);

    // Render loading state
    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <Skeleton className="h-8 w-48 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Card key={i}>
                            <CardContent className="p-6">
                                <Skeleton className="h-20 w-full" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    // Render no MCU state
    if (!mcuStatus?.hasMCU) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Zap className="h-8 w-8 text-primary" />
                        Tự động hóa
                    </h1>
                    <p className="text-muted-foreground">
                        Quản lý các quy tắc tự động hóa trong nhà thông minh
                    </p>
                </div>

                <Alert>
                    <WifiOff className="h-4 w-4" />
                    <AlertDescription>
                        Nhà chưa được kết nối với MCU Gateway. Vui lòng ghép nối ESP32 để sử dụng tính năng tự động hóa.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Render MCU offline state
    if (!mcuStatus?.isOnline) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Zap className="h-8 w-8 text-primary" />
                        Tự động hóa
                    </h1>
                    <p className="text-muted-foreground">
                        Quản lý các quy tắc tự động hóa trong nhà thông minh
                    </p>
                </div>

                <Alert variant="destructive">
                    <WifiOff className="h-4 w-4" />
                    <AlertDescription className="flex items-center justify-between">
                        <span>MCU Gateway đang offline. Không thể thay đổi cấu hình tự động hóa.</span>
                        <Button variant="outline" size="sm" onClick={() => checkMCUStatus()}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Kiểm tra lại
                        </Button>
                    </AlertDescription>
                </Alert>

                {/* Still show current config in read-only mode */}
                {automationConfig && (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <AutomationCard
                            title="Tự động đèn"
                            description="Bật đèn khi phát hiện chuyển động và ánh sáng yếu"
                            enabled={automationConfig.autoLightEnabled}
                            onToggle={() => { }}
                            loading={false}
                            icon={<Lightbulb className="h-6 w-6 text-yellow-600" />}
                            iconBgColor="bg-yellow-100"
                            triggerInfo="Kích hoạt bởi cảm biến chuyển động + ánh sáng"
                            threshold={automationConfig.autoLightThreshold}
                            thresholdLabel="Ngưỡng ánh sáng"
                            disabled={true}
                        />
                        <AutomationCard
                            title="Tự động quạt"
                            description="Bật quạt khi nhiệt độ vượt ngưỡng"
                            enabled={automationConfig.autoFanEnabled}
                            onToggle={() => { }}
                            loading={false}
                            icon={<Fan className="h-6 w-6 text-blue-600" />}
                            iconBgColor="bg-blue-100"
                            triggerInfo="Kích hoạt bởi cảm biến nhiệt độ"
                            threshold={automationConfig.autoFanThreshold}
                            thresholdLabel="Ngưỡng nhiệt độ (°C)"
                            disabled={true}
                        />
                        <AutomationCard
                            title="Tự động đóng cửa"
                            description="Đóng cửa khi phát hiện mưa"
                            enabled={automationConfig.autoCloseDoorEnabled}
                            onToggle={() => { }}
                            loading={false}
                            icon={<DoorOpen className="h-6 w-6 text-green-600" />}
                            iconBgColor="bg-green-100"
                            triggerInfo="Kích hoạt bởi cảm biến mưa"
                            disabled={true}
                        />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Zap className="h-8 w-8 text-primary" />
                        Tự động hóa
                    </h1>
                    <p className="text-muted-foreground">
                        Quản lý các quy tắc tự động hóa trong nhà thông minh
                    </p>
                </div>
                <Button variant="outline" onClick={loadAutomationConfig}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Làm mới
                </Button>
            </div>

            {/* MCU Status */}
            <div className="flex items-center gap-2 text-sm">
                <div className={`h-2 w-2 rounded-full ${mcuStatus.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-muted-foreground">
                    MCU Gateway: {mcuStatus.isOnline ? 'Đang hoạt động' : 'Offline'}
                </span>
            </div>

            <Separator />

            {/* Automation Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Auto Light */}
                <AutomationCard
                    title="Tự động đèn"
                    description="Bật đèn khi phát hiện chuyển động và ánh sáng yếu. Tắt sau 30 giây không có chuyển động."
                    enabled={automationConfig?.autoLightEnabled ?? false}
                    onToggle={() => toggleAutomation('AUTO_LIGHT', !automationConfig?.autoLightEnabled)}
                    loading={isTogglingLight}
                    icon={<Lightbulb className="h-6 w-6 text-yellow-600" />}
                    iconBgColor="bg-yellow-100"
                    triggerInfo="Cảm biến chuyển động + cảm biến ánh sáng"
                    threshold={automationConfig?.autoLightThreshold}
                    thresholdLabel="Ngưỡng ánh sáng (LDR)"
                />

                {/* Auto Fan */}
                <AutomationCard
                    title="Tự động quạt"
                    description="Bật quạt khi nhiệt độ trong nhà vượt ngưỡng. Tắt khi nhiệt độ giảm 2°C dưới ngưỡng."
                    enabled={automationConfig?.autoFanEnabled ?? false}
                    onToggle={() => toggleAutomation('AUTO_FAN', !automationConfig?.autoFanEnabled)}
                    loading={isTogglingFan}
                    icon={<Fan className="h-6 w-6 text-blue-600" />}
                    iconBgColor="bg-blue-100"
                    triggerInfo="Cảm biến nhiệt độ DHT11 trong nhà"
                    threshold={automationConfig?.autoFanThreshold}
                    thresholdLabel="Ngưỡng nhiệt độ (°C)"
                />

                {/* Auto Close Door */}
                <AutomationCard
                    title="Tự động đóng cửa"
                    description="Tự động đóng cửa khi cảm biến phát hiện mưa để bảo vệ ngôi nhà."
                    enabled={automationConfig?.autoCloseDoorEnabled ?? false}
                    onToggle={() => toggleAutomation('AUTO_CLOSE_DOOR', !automationConfig?.autoCloseDoorEnabled)}
                    loading={isTogglingDoor}
                    icon={<DoorOpen className="h-6 w-6 text-green-600" />}
                    iconBgColor="bg-green-100"
                    triggerInfo="Cảm biến mưa"
                />
            </div>

            {/* Threshold Configuration Section */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Settings2 className="h-5 w-5" />
                        Cấu hình ngưỡng kích hoạt
                    </CardTitle>
                    <CardDescription>
                        Điều chỉnh các ngưỡng để tự động hóa hoạt động phù hợp với môi trường của bạn
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 md:grid-cols-3">
                        {/* Light Threshold */}
                        <div className="space-y-2">
                            <Label htmlFor="lightThreshold" className="flex items-center gap-2">
                                <Sun className="h-4 w-4 text-yellow-500" />
                                Ngưỡng ánh sáng (LDR)
                            </Label>
                            <Input
                                id="lightThreshold"
                                type="number"
                                min={0}
                                max={4095}
                                placeholder="0 - 4095"
                                value={editLightThreshold}
                                onChange={(e) => handleThresholdChange(e.target.value, setEditLightThreshold, 4095)}
                                onBlur={() => handleThresholdBlur(editLightThreshold, setEditLightThreshold, 0, 4095)}
                                disabled={isSavingConfig || !mcuStatus?.isOnline}
                            />
                            <p className="text-xs text-muted-foreground">
                                Bật đèn khi LDR &lt; ngưỡng. Giá trị thấp = bật sớm hơn.
                            </p>
                        </div>

                        {/* Temperature Threshold */}
                        <div className="space-y-2">
                            <Label htmlFor="tempThreshold" className="flex items-center gap-2">
                                <Thermometer className="h-4 w-4 text-red-500" />
                                Ngưỡng nhiệt độ (°C)
                            </Label>
                            <Input
                                id="tempThreshold"
                                type="number"
                                min={15}
                                max={50}
                                placeholder="15 - 50"
                                value={editTempThreshold}
                                onChange={(e) => handleThresholdChange(e.target.value, setEditTempThreshold, 50)}
                                onBlur={() => handleThresholdBlur(editTempThreshold, setEditTempThreshold, 15, 50)}
                                disabled={isSavingConfig || !mcuStatus?.isOnline}
                            />
                            <p className="text-xs text-muted-foreground">
                                Bật quạt khi nhiệt độ &gt; ngưỡng.
                            </p>
                        </div>

                        {/* Gas Threshold */}
                        <div className="space-y-2">
                            <Label htmlFor="gasThreshold" className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-orange-500" />
                                Ngưỡng cảnh báo Gas
                            </Label>
                            <Input
                                id="gasThreshold"
                                type="number"
                                min={0}
                                max={4095}
                                placeholder="0 - 4095"
                                value={editGasThreshold}
                                onChange={(e) => handleThresholdChange(e.target.value, setEditGasThreshold, 4095)}
                                onBlur={() => handleThresholdBlur(editGasThreshold, setEditGasThreshold, 0, 4095)}
                                disabled={isSavingConfig || !mcuStatus?.isOnline}
                            />
                            <p className="text-xs text-muted-foreground">
                                Cảnh báo khi MQ2 &gt; ngưỡng.
                            </p>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <Button
                            onClick={saveThresholds}
                            disabled={isSavingConfig || !mcuStatus?.isOnline}
                        >
                            {isSavingConfig ? (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                    Đang lưu...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Lưu cấu hình
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Info Section */}
            <Card className="bg-muted/30">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        Lưu ý
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                    <p>• Các quy tắc tự động hóa được xử lý trực tiếp trên MCU Gateway (ESP32) để đảm bảo phản hồi nhanh.</p>
                    <p>• Khi MCU offline, các quy tắc sẽ không hoạt động cho đến khi kết nối lại.</p>
                    <p>• Trong trường hợp khẩn cấp (cháy, rò gas), hệ thống sẽ tự động mở cửa và tắt các quy tắc tự động.</p>
                    <p>• Cấu hình ngưỡng được lưu trên ESP32 và sẽ được giữ nguyên khi khởi động lại.</p>
                </CardContent>
            </Card>
        </div>
    );
}
