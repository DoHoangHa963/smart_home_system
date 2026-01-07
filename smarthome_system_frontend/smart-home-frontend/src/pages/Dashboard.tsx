import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Zap, Droplets, Thermometer, Activity, 
  Home, Moon, Sun, Shield, Play, 
  AlertCircle, CheckCircle2, Clock
} from 'lucide-react';

// --- Types & Mock Data ---
interface ActivityLog {
  id: string;
  action: string;
  time: string;
  type: 'info' | 'warning' | 'success';
}

const RECENT_ACTIVITY: ActivityLog[] = [
  { id: '1', action: 'Phát hiện chuyển động ở Sân trước', time: '2 phút trước', type: 'warning' },
  { id: '2', action: 'Đèn phòng khách đã tắt', time: '15 phút trước', type: 'info' },
  { id: '3', action: 'Điều hòa phòng ngủ bật (24°C)', time: '1 giờ trước', type: 'success' },
  { id: '4', action: 'Cửa chính đã khóa', time: '2 giờ trước', type: 'success' },
  { id: '5', action: 'Hệ thống tưới cây bắt đầu', time: '06:00 AM', type: 'info' },
];

const SCENES = [
  { id: 'home', name: 'Về nhà', icon: <Home className="h-6 w-6" />, color: 'text-blue-500 bg-blue-100' },
  { id: 'away', name: 'Ra ngoài', icon: <Shield className="h-6 w-6" />, color: 'text-slate-500 bg-slate-100' },
  { id: 'night', name: 'Đi ngủ', icon: <Moon className="h-6 w-6" />, color: 'text-indigo-500 bg-indigo-100' },
  { id: 'morning', name: 'Thức dậy', icon: <Sun className="h-6 w-6" />, color: 'text-orange-500 bg-orange-100' },
];

// --- Sub-components ---

// 1. Thẻ thống kê nhỏ (Stat Card)
const StatCard = ({ title, value, subtext, icon, trend }: any) => (
  <Card>
    <CardContent className="p-6 flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-xl ${trend || 'bg-primary/10 text-primary'}`}>
        {icon}
      </div>
    </CardContent>
  </Card>
);

// 2. Main Dashboard Component
export default function Dashboard() {
  const [energyUsage, setEnergyUsage] = useState(65); // Mock 65%

  return (
    <div className="space-y-6">
      {/* --- Section 1: Header & Greeting --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
            <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Chào buổi sáng, Admin!</h1>
            <p className="text-muted-foreground">Hôm nay trời nắng đẹp, nhiệt độ ngoài trời là 28°C.</p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline">Báo cáo</Button>
           <Button>Quét toàn bộ</Button>
        </div>
      </div>

      {/* --- Section 2: Quick Stats (Responsive Grid) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Nhiệt độ nhà" 
          value="24.5°C" 
          subtext="Độ ẩm: 60%"
          icon={<Thermometer className="h-5 w-5" />}
          trend="bg-orange-100 text-orange-600"
        />
        <StatCard 
          title="Thiết bị đang bật" 
          value="8" 
          subtext="Trên tổng số 24"
          icon={<Zap className="h-5 w-5" />}
          trend="bg-yellow-100 text-yellow-600"
        />
        <StatCard 
          title="Điện năng tiêu thụ" 
          value="12.4 kWh" 
          subtext="-15% so với hôm qua"
          icon={<Activity className="h-5 w-5" />}
          trend="bg-green-100 text-green-600"
        />
        <StatCard 
          title="Nước sinh hoạt" 
          value="1.2 m³" 
          subtext="Ổn định"
          icon={<Droplets className="h-5 w-5" />}
          trend="bg-blue-100 text-blue-600"
        />
      </div>

      {/* --- Section 3: Split Layout (Main Content + Sidebar) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3): Scenes & Energy */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Scenes */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Ngữ cảnh nhanh</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {SCENES.map((scene) => (
                <Card key={scene.id} className="cursor-pointer hover:shadow-md transition-all hover:border-primary/50 group">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <div className={`p-3 rounded-full transition-transform group-hover:scale-110 ${scene.color}`}>
                      {scene.icon}
                    </div>
                    <div>
                      <span className="font-semibold block">{scene.name}</span>
                      <span className="text-xs text-muted-foreground">Kích hoạt</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Energy Widget (Demo for Progress) */}
          <Card>
            <CardHeader>
              <CardTitle>Mục tiêu tiết kiệm điện</CardTitle>
              <CardDescription>Tháng này bạn đã dùng 65% ngân sách năng lượng.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-muted-foreground">Đã dùng: 320 kWh</span>
                <span className="font-medium">Mục tiêu: 500 kWh</span>
              </div>
              <Progress value={energyUsage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-4">
                Tip: Tắt điều hòa khi ra khỏi phòng có thể tiết kiệm 15% điện năng.
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Right Column (1/3): Activity Log */}
        <div className="lg:col-span-1">
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Hoạt động gần đây
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <ScrollArea className="h-[400px] px-6">
                <div className="space-y-6 pb-6">
                  {RECENT_ACTIVITY.map((log, index) => (
                    <div key={log.id} className="relative pl-6 border-l border-border last:border-0">
                      {/* Timeline dot */}
                      <div className={`
                        absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-white
                        ${log.type === 'warning' ? 'bg-red-500' : 
                          log.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}
                      `} />
                      
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium leading-none">{log.action}</span>
                        <span className="text-xs text-muted-foreground">{log.time}</span>
                      </div>
                      
                      {/* Separator between items, except last one */}
                      {index !== RECENT_ACTIVITY.length - 1 && (
                        <div className="mt-6" /> 
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}