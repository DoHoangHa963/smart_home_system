import React, { useEffect, useState } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Users, Home, Cpu, Activity, ArrowUp, AlertCircle, 
  RefreshCcw, Download, Calendar
} from 'lucide-react';

// --- Imports Components (Đồng bộ với User Dashboard) ---
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge'; // Nếu chưa có thì dùng div class tương tự

// --- API & Types ---
import { adminApi } from '@/lib/api/admin.api';
import type { AdminDashboardData } from '@/types/admin';

// --- Constants ---
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const STATUS_COLORS: Record<string, string> = {
  ONLINE: '#10B981', // Green
  OFFLINE: '#EF4444', // Red
  UNKNOWN: '#9CA3AF' // Gray
};

export default function AdminDashboard() {
  // State
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Data function
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getDashboardDetail();
      
      if (response.data && response.data.success && response.data.data) {
        setData(response.data.data);
      } else {
        setError(response.data?.message || 'Failed to load dashboard data');
      }
    } catch (err: any) {
      console.error('Dashboard Error:', err);
      setError('Network error or server is unavailable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // --- LOADING STATE ---
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground animate-pulse">Đang tải dữ liệu hệ thống...</p>
        </div>
      </div>
    );
  }

  // --- ERROR STATE ---
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
        </div>
        <div className="space-y-2">
            <h3 className="text-lg font-semibold">Không thể tải dữ liệu</h3>
            <p className="text-muted-foreground max-w-sm">{error || 'No data available'}</p>
        </div>
        <Button onClick={fetchDashboardData} variant="default">
          <RefreshCcw className="mr-2 h-4 w-4" /> Thử lại
        </Button>
      </div>
    );
  }

  const { overview, deviceTypeDistribution, deviceStatusDistribution, recentActivities } = data;

  // Transform Data for Charts
  const deviceTypeData = Object.entries(deviceTypeDistribution).map(([name, value]) => ({ name, value }));
  const deviceStatusData = Object.entries(deviceStatusDistribution).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      {/* --- HEADER (Đồng bộ style với User Dashboard) --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
             <AvatarImage src="" alt="Admin" />
             <AvatarFallback className="bg-primary text-primary-foreground">AD</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Hệ thống quản trị</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-1">
               <Calendar className="h-3 w-3" /> Cập nhật lúc: {new Date().toLocaleTimeString('vi-VN')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={fetchDashboardData}>
             <RefreshCcw className="mr-2 h-4 w-4" /> Làm mới
           </Button>
           <Button size="sm">
             <Download className="mr-2 h-4 w-4" /> Xuất báo cáo
           </Button>
        </div>
      </div>

      {/* --- STAT CARDS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Tổng người dùng" 
          value={overview.totalUsers} 
          subValue={`+${overview.newUsersToday} hôm nay`}
          icon={<Users className="w-5 h-5" />}
          trend="bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
        />
        <StatCard 
          title="Tổng số nhà" 
          value={overview.totalHomes} 
          subValue={`+${overview.newHomesToday} mới`}
          icon={<Home className="w-5 h-5" />}
          trend="bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
        />
        <StatCard 
          title="Thiết bị Online" 
          value={`${overview.onlineDevices}/${overview.totalDevices}`} 
          subValue="Tỷ lệ hoạt động"
          icon={<Cpu className="w-5 h-5" />}
          trend="bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
        />
        <StatCard 
          title="Trạng thái hệ thống" 
          value="Ổn định" 
          subValue="All services OK"
          icon={<Activity className="w-5 h-5" />}
          trend="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400"
        />
      </div>

      {/* --- CHARTS SECTION (Split Layout) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Device Types */}
        <Card>
          <CardHeader>
            <CardTitle>Phân bố loại thiết bị</CardTitle>
            <CardDescription>Tỷ lệ các loại thiết bị trong toàn hệ thống</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceTypeData}
                  cx="50%" cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {deviceTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Chart 2: Status */}
        <Card>
          <CardHeader>
            <CardTitle>Trạng thái kết nối</CardTitle>
            <CardDescription>Tình trạng Online/Offline thời gian thực</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceStatusData}
                  cx="50%" cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deviceStatusData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--foreground)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
                
                {/* Center Text for Donut */}
                <text x="50%" y="45%" textAnchor="middle" dominantBaseline="middle" className="text-3xl font-bold fill-foreground">
                  {overview.totalDevices}
                </text>
                <text x="50%" y="55%" textAnchor="middle" dominantBaseline="middle" className="text-sm fill-muted-foreground">
                  Tổng thiết bị
                </text>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* --- RECENT ACTIVITIES (Table style but inside Card) --- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
                <CardTitle>Log hệ thống gần đây</CardTitle>
                <CardDescription>Các sự kiện mới nhất từ người dùng và thiết bị</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-primary">Xem tất cả</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-semibold">
                        <tr>
                            <th className="px-6 py-3">Thời gian</th>
                            <th className="px-6 py-3">Người dùng</th>
                            <th className="px-6 py-3">Hành động</th>
                            <th className="px-6 py-3 text-center">Loại</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {recentActivities.length > 0 ? (
                            recentActivities.map((log) => (
                                <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                                        {new Date(log.timestamp).toLocaleString('vi-VN')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-6 w-6">
                                                <AvatarFallback className="text-[10px]">{log.relatedUser?.substring(0,2).toUpperCase() || 'SY'}</AvatarFallback>
                                            </Avatar>
                                            <span>{log.relatedUser || 'System'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                        {log.description}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Badge variant={
                                            log.type === 'ERROR' ? 'destructive' : 
                                            log.type === 'WARNING' ? 'secondary' : // hoặc custom warning style
                                            'default'
                                        } className={`
                                            ${log.type === 'INFO' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100 border-none' : ''}
                                            ${log.type === 'WARNING' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none' : ''}
                                            ${log.type === 'ERROR' ? 'bg-red-100 text-red-700 hover:bg-red-100 border-none' : ''}
                                        `}>
                                            {log.type}
                                        </Badge>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                                    Chưa có dữ liệu ghi nhận.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- SUB COMPONENTS (Refactored to use Shadcn Card) ---

interface StatCardProps {
  title: string;
  value: number | string;
  subValue: string;
  icon: React.ReactNode;
  trend: string; // Class string for color/bg
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subValue, icon, trend }) => {
  return (
    <Card>
        <CardContent className="p-6 flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
                <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
                <div className="flex items-center mt-1 text-xs text-muted-foreground">
                    <ArrowUp className="w-3 h-3 mr-1 text-green-500" /> {/* Giả sử luôn tăng, có thể sửa logic sau */}
                    <span>{subValue}</span>
                </div>
            </div>
            <div className={`p-3 rounded-xl ${trend}`}>
                {icon}
            </div>
        </CardContent>
    </Card>
  );
};