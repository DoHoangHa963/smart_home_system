// components/layout/Sidebar.tsx - UNIFIED SIDEBAR
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/store/authStore';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  LayoutDashboard,
  Lightbulb,
  Home,
  Settings,
  Zap,
  Clapperboard,
  Users,
  LogOut,
  ShieldCheck,
  Building2,
  UserCog,
  BarChart3,
  History,
  DoorOpen,
  FileText,
  MapPin,
  User,
  Bell,
  HelpCircle,
  Cpu,
  CreditCard
} from 'lucide-react';
import { HOME_PERMISSIONS, SYSTEM_PERMISSIONS } from '@/types/permission';
import { useEffect, useMemo, useState } from 'react';
import { useHomeStore } from '@/store/homeStore';

interface NavItem {
  icon: any;
  label: string;
  path: string;
  permission?: string | string[];
  systemOnly?: boolean; // Chỉ hiện cho ADMIN hệ thống
  badge?: string;
  description?: string;
  requiresHome?: boolean; // Yêu cầu phải có home được chọn
}

interface NavSection {
  title?: string;
  items: NavItem[];
  systemOnly?: boolean; // Toàn bộ section chỉ cho ADMIN
  requiresHome?: boolean; // Yêu cầu phải có home được chọn
}

export default function Sidebar({ isMobile = false }: { isMobile?: boolean }) {
  const { isAdmin, can, hasHomeAccess, homeRole } = usePermission();
  const { logout, user } = useAuthStore();
  const { currentHome } = useHomeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [activePath, setActivePath] = useState(location.pathname);

  // Cập nhật active path khi location thay đổi
  useEffect(() => {
    setActivePath(location.pathname);
  }, [location.pathname]);

  // ============================================
  // UNIFIED NAVIGATION - Tất cả menu trong 1
  // ============================================
  const allSections: NavSection[] = useMemo(() => [
    // SECTION 1: Dashboard & Overview (Tất cả user)
    {
      title: 'Tổng quan',
      items: [
        {
          icon: MapPin,
          label: 'Chọn nhà',
          path: '/select-home',
        },
        {
          icon: LayoutDashboard,
          label: 'Dashboard',
          path: '/dashboard',
          permission: HOME_PERMISSIONS.HOME_DASHBOARD_VIEW,
          requiresHome: true,
        },
        {
          icon: BarChart3,
          label: 'Thống kê',
          path: '/analytics',
          systemOnly: true,
          badge: 'Admin',
        },
      ],
    },

    // SECTION 2: Quản lý thiết bị (Home users)
    {
      title: 'Thiết bị & Phòng',
      requiresHome: true,
      items: [
        {
          icon: Lightbulb,
          label: 'Thiết bị',
          path: '/devices',
          permission: HOME_PERMISSIONS.DEVICE_VIEW,
          requiresHome: true,
        },
        {
          icon: DoorOpen,
          label: 'Phòng',
          path: '/rooms',
          permission: HOME_PERMISSIONS.ROOM_VIEW,
          requiresHome: true,
        },
      ],
    },

    // SECTION 3: Tự động hóa (Home users)
    {
      title: 'Tự động hóa',
      requiresHome: true,
      items: [
        {
          icon: Zap,
          label: 'Tự động hóa',
          path: '/automations',
          permission: HOME_PERMISSIONS.AUTOMATION_VIEW,
          requiresHome: true,
        },
        {
          icon: Clapperboard,
          label: 'Ngữ cảnh',
          path: '/scenes',
          permission: HOME_PERMISSIONS.SCENE_VIEW,
          requiresHome: true,
        },
      ],
    },

    // SECTION 4: Quản lý thành viên & logs (Home users có quyền)
    {
      title: 'Quản lý',
      requiresHome: true,
      items: [
        {
          icon: Users,
          label: 'Thành viên',
          path: '/members',
          permission: HOME_PERMISSIONS.MEMBER_VIEW,
          requiresHome: true,
        },
        {
          icon: CreditCard,
          label: 'Thẻ RFID',
          path: '/rfid',
          permission: HOME_PERMISSIONS.RFID_VIEW,
          requiresHome: true,
          description: 'Quản lý thẻ RFID và kiểm soát truy cập',
        },
        {
          icon: History,
          label: 'Nhật ký hoạt động',
          path: '/logs',
          permission: HOME_PERMISSIONS.HOME_LOGS_VIEW,
          requiresHome: true,
        },
        {
          icon: Bell,
          label: 'Thông báo',
          path: '/notifications',
          // permission: HOME_PERMISSIONS.NOTIFICATION_VIEW, // Removed invalid permission
          requiresHome: true,
        },
      ],
    },

    // SECTION 5: Cài đặt nhà (Home users có quyền)
    {
      title: 'Cài đặt',
      requiresHome: true,
      items: [
        {
          icon: Settings,
          label: 'Cài đặt nhà',
          path: '/home-settings',
          permission: HOME_PERMISSIONS.HOME_SETTINGS_VIEW,
          requiresHome: true,
        },
        {
          icon: Cpu,
          label: 'MCU Gateway',
          path: '/mcu/setup',
          permission: HOME_PERMISSIONS.HOME_SETTINGS_VIEW,
          requiresHome: true,
          description: 'Quản lý thiết bị ESP32 MCU Gateway',
        },
      ],
    },

    // SECTION 6: ADMIN HỆ THỐNG (Chỉ hiện cho ADMIN)
    {
      title: 'Quản trị hệ thống',
      systemOnly: true,
      items: [
        {
          icon: UserCog,
          label: 'Người dùng',
          path: '/system/users',
          systemOnly: true,
          badge: 'Admin',
        },
        {
          icon: Building2,
          label: 'Tất cả nhà',
          path: '/system/homes',
          systemOnly: true,
          badge: 'Admin',
        },
        {
          icon: FileText,
          label: 'Nhật ký hệ thống',
          path: '/system/logs',
          systemOnly: true,
          badge: 'Admin',
        },
        {
          icon: Settings,
          label: 'Cấu hình hệ thống',
          path: '/system/settings',
          systemOnly: true,
          badge: 'Admin',
        },
      ],
    },

    // SECTION 7: Hỗ trợ & Tài khoản
    {
      items: [
        {
          icon: User,
          label: 'Tài khoản',
          path: '/account',
        },
        {
          icon: HelpCircle,
          label: 'Trợ giúp',
          path: '/help',
        },
      ],
    },
  ], []);

  // ============================================
  // LỌC ITEMS THEO QUYỀN
  // ============================================
  const canUseHomeSidebar = isAdmin || homeRole === 'OWNER';
  const hasSelectedHome = Boolean(currentHome);

  const filterItems = (items: NavItem[]): NavItem[] => {
    return items.filter(item => {
      // Nếu item chỉ dành cho Admin hệ thống
      if (item.systemOnly && !isAdmin) {
        return false;
      }

      // Nếu item yêu cầu có home nhưng chưa chọn home
      if (item.requiresHome && !hasSelectedHome && !isAdmin) {
        return false;
      }

      // Admin hệ thống thấy tất cả (trừ các item yêu cầu home nếu chưa chọn home)
      if (isAdmin) {
        // Admin có thể xem các item yêu cầu home mà không cần chọn home
        return true;
      }

      // Không có permission requirement = hiện cho tất cả
      if (!item.permission) return true;

      // Check permission
      return can(item.permission as any);
    });
  };

  // Lọc sections
  const visibleSections = useMemo(() => {
    return allSections
      .filter(section => {
        // ADMIN hệ thống → thấy tất cả
        if (isAdmin) return true;

        // Section chỉ dành cho ADMIN
        if (section.systemOnly) return false;

        // Section yêu cầu có home nhưng chưa chọn home
        if (section.requiresHome && !hasSelectedHome) return false;

        return true;
      })
      .map(section => ({
        ...section,
        items: filterItems(section.items),
      }))
      .filter(section => section.items.length > 0);
  }, [isAdmin, hasSelectedHome, homeRole, currentHome]);

  // ============================================
  // XỬ LÝ LOGOUT
  // ============================================
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div
      className={cn(
        'bg-background h-full flex flex-col transition-all duration-200',
        isMobile
          ? 'w-full border-0'
          : 'w-64 border-r fixed h-screen left-0 top-0 hidden md:flex'
      )}
    >
      {/* LOGO & ROLE INDICATOR */}
      <div className="flex h-16 items-center border-b px-6 shrink-0">
        <Zap className="mr-2 h-6 w-6 text-primary" />
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-lg font-bold tracking-tight truncate">SmartHome</span>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 text-blue-500" />
                System Admin
              </span>
            ) : currentHome ? (
              <>
                <span className="text-xs text-muted-foreground truncate">
                  {currentHome.name}
                </span>
                {homeRole && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {homeRole}
                  </Badge>
                )}
              </>
            ) : (
              <span className="text-xs text-muted-foreground">
                Chưa chọn nhà
              </span>
            )}
          </div>
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
        {/* Thông báo nếu user chưa có home */}
        {!hasSelectedHome && !isAdmin && (
          <div className="px-4 py-6 text-center bg-muted/30 mx-3 rounded-lg mb-4">
            <Home className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted-foreground mb-2">
              Chọn hoặc tạo nhà để bắt đầu
            </p>
            <NavLink
              to="/select-home"
              className={cn(
                buttonVariants({ variant: 'default', size: 'sm' }),
                'w-full mt-2'
              )}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Chọn nhà ngay
            </NavLink>
          </div>
        )}

        {/* Render các sections */}
        {visibleSections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="mb-6">
            {section.title && (
              <div className="px-3 mb-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  {section.title}
                  {section.systemOnly && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      ADMIN
                    </Badge>
                  )}
                </h3>
              </div>
            )}

            <div className="space-y-1 px-3">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      buttonVariants({ variant: isActive ? 'secondary' : 'ghost' }),
                      'w-full justify-start gap-3 h-10 relative group transition-all',
                      isActive && 'bg-secondary font-semibold text-primary shadow-sm',
                      !isActive && 'hover:bg-accent hover:text-accent-foreground'
                    )
                  }
                  title={item.description || item.label}
                  onClick={() => setActivePath(item.path)}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate flex-1 text-sm">{item.label}</span>
                  {item.badge && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </NavLink>
              ))}
            </div>

            {sectionIndex < visibleSections.length - 1 && section.title && (
              <Separator className="my-4 mx-3" />
            )}
          </div>
        ))}
      </div>

      {/* USER INFO & FOOTER */}
      <div className="border-t p-4 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'w-full justify-start gap-3 h-10 transition-colors',
            'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200'
          )}
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    </div>
  );
}