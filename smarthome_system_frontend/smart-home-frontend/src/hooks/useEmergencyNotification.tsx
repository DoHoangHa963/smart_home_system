import { useEffect, useState } from 'react';
import { webSocketService } from '@/lib/websocket';
import { useHomeStore } from '@/store/homeStore';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';

export interface EmergencyNotification {
  type: 'FIRE' | 'GAS' | 'BOTH' | 'CLEARED';
  isActive: boolean;
  fire?: boolean;
  gas?: boolean;
  timestamp: number;
  /** Mô tả cụ thể loại khẩn cấp đã giải quyết (từ backend) */
  resolvedTypeLabel?: string;
}

export function useEmergencyNotification() {
  const { currentHome } = useHomeStore();
  const [emergency, setEmergency] = useState<EmergencyNotification | null>(null);

  useEffect(() => {
    if (!currentHome?.id) {
      setEmergency(null);
      return;
    }

    const topic = `/topic/home/${currentHome.id}/emergency`;
    
    // Activate WebSocket if not already active
    webSocketService.activate();

    // Subscribe to emergency topic
    const subId = webSocketService.subscribe(topic, (message) => {
      try {
        console.log('[Emergency] Received emergency notification:', message);
        
        let emergencyData: EmergencyNotification;
        
        if (typeof message === 'string') {
          emergencyData = JSON.parse(message);
        } else {
          emergencyData = message as EmergencyNotification;
        }

        setEmergency(emergencyData);

        // Show toast notification
        if (emergencyData.isActive) {
          let title = '';
          let description = '';
          
          switch (emergencyData.type) {
            case 'FIRE':
              title = '🚨 PHÁT HIỆN LỬA!';
              description = 'Cảm biến lửa đã phát hiện có lửa trong nhà. Vui lòng sơ tán ngay lập tức!';
              break;
            case 'GAS':
              title = '⚠️ RÒ RỈ KHÍ GAS!';
              description = 'Cảm biến khí gas đã phát hiện rò rỉ. Vui lòng thông gió và kiểm tra ngay!';
              break;
            case 'BOTH':
              title = '🚨 KHẨN CẤP: LỬA VÀ KHÍ GAS!';
              description = 'Phát hiện đồng thời lửa và rò rỉ khí gas. Sơ tán ngay lập tức!';
              break;
            default:
              title = '🚨 CẢNH BÁO KHẨN CẤP!';
              description = 'Có tình huống khẩn cấp xảy ra trong nhà. Vui lòng kiểm tra ngay!';
          }

          toast.error(title, {
            description,
            duration: 0, // Never auto-dismiss
            action: {
              label: 'Xem chi tiết',
              onClick: () => {
                // Navigate to notifications page or show details
                window.location.href = '/notifications';
              },
            },
            icon: <AlertTriangle className="h-5 w-5" />,
          });
        } else {
          // Emergency cleared - dùng mô tả cụ thể nếu có
          const resolvedLabel = emergencyData.resolvedTypeLabel || 'Tình huống khẩn cấp';
          toast.success('✅ Đã được giải quyết', {
            description: `${resolvedLabel} đã được xác nhận an toàn. Hệ thống đã trở về trạng thái bình thường.`,
            duration: 5000,
          });
        }
      } catch (error) {
        console.error('[Emergency] Error processing emergency notification:', error);
      }
    });

    return () => {
      if (subId) {
        webSocketService.unsubscribe(subId);
      }
      setEmergency(null);
    };
  }, [currentHome?.id]);

  return { emergency, clearEmergency: () => setEmergency(null) };
}
