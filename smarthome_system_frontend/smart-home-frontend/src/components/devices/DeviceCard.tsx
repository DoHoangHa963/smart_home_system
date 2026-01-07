import { Device } from '@/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Lightbulb, Fan, Tv, Thermometer, Lock, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeviceCardProps {
  device: Device;
  onToggle: (id: string) => void;
}

const getDeviceIcon = (type: string) => {
  switch (type) {
    case 'light': return <Lightbulb className="h-5 w-5" />;
    case 'fan': return <Fan className="h-5 w-5" />;
    case 'tv': return <Tv className="h-5 w-5" />;
    case 'ac': return <Thermometer className="h-5 w-5" />;
    case 'lock': return <Lock className="h-5 w-5" />;
    default: return <Zap className="h-5 w-5" />;
  }
};

const getDeviceColor = (type: string, isActive: boolean) => {
  if (!isActive) return "bg-gray-100 text-gray-400"; // Off state
  
  switch (type) {
    case 'light': return "bg-yellow-100 text-yellow-600";
    case 'fan': return "bg-blue-100 text-blue-600";
    case 'ac': return "bg-cyan-100 text-cyan-600";
    case 'tv': return "bg-purple-100 text-purple-600";
    case 'lock': return "bg-red-100 text-red-600";
    default: return "bg-primary/10 text-primary";
  }
};

export default function DeviceCard({ device, onToggle }: DeviceCardProps) {
  const isOn = device.status === 'on';

  return (
    <Card className={cn(
      "border transition-all duration-200 hover:shadow-md", // Hiệu ứng hover nhẹ
      isOn ? "border-primary/50 bg-primary/[0.02]" : "border-border bg-card" // Active state tinh tế
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        {/* Icon Box */}
        <div className={cn("p-2.5 rounded-xl transition-colors", getDeviceColor(device.type, isOn))}>
          {getDeviceIcon(device.type)}
        </div>
        
        {/* Toggle Switch */}
        <Switch 
          checked={isOn} 
          onCheckedChange={() => onToggle(device.id)} 
          className="data-[state=checked]:bg-primary"
        />
      </CardHeader>

      <CardContent className="pt-4">
        <div className="flex justify-between items-end">
          <div>
            <h3 className="font-semibold text-lg leading-none tracking-tight text-foreground">
              {device.name}
            </h3>
            <p className="text-sm text-muted-foreground mt-1.5 font-medium">
              {device.room}
            </p>
          </div>
          
          {/* Status Badge (Chỉ hiện khi bật để đỡ rối mắt, hoặc hiện mờ khi tắt) */}
          <Badge variant={isOn ? "default" : "outline"} className={cn("font-normal", !isOn && "text-muted-foreground")}>
            {isOn ? 'On' : 'Off'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}