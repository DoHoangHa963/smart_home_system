// components/layout/Sidebar.tsx - UNIFIED SIDEBAR
import { usePermission } from '@/hooks/usePermission';
import { useAuthStore } from '@/store/authStore';
import { NavLink } from 'react-router-dom';
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
  MapPin
} from 'lucide-react';
import { HOME_PERMISSIONS, SYSTEM_PERMISSIONS } from '@/types/permission';
import { useEffect, useMemo } from 'react';

interface NavItem {
  icon: any;
  label: string;
  path: string;
  permission?: string | string[];
  systemOnly?: boolean; // Chỉ hiện cho ADMIN hệ thống
  badge?: string;
  description?: string;
}

interface NavSection {
  title?: string;
  items: NavItem[];
  systemOnly?: boolean; // Toàn bộ section chỉ cho ADMIN
}

export default function Sidebar({ isMobile = false }: { isMobile?: boolean }) {
  const { isAdmin, can, hasHomeAccess, homeRole } = usePermission();
  const { logout } = useAuthStore();

  // ============================================
  // UNIFIED NAVIGATION - Tất cả menu trong 1
  // ============================================
  const allSections: NavSection[] = [
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
        },
        {
          icon: BarChart3,
          label: 'Thống kê',
          path: '/analytics',
          permission: [HOME_PERMISSIONS.HOME_DASHBOARD_VIEW, HOME_PERMISSIONS.HOME_LOGS_VIEW],
        },
      ],
    },

    // SECTION 2: Quản lý thiết bị (Home users)
    {
      title: 'Thiết bị & Phòng',
      items: [
        {
          icon: Lightbulb,
          label: 'Thiết bị',
          path: '/devices',
          permission: HOME_PERMISSIONS.DEVICE_VIEW,
        },
        {
          icon: DoorOpen,
          label: 'Phòng',
          path: '/rooms',
          permission: HOME_PERMISSIONS.ROOM_VIEW,
        },
      ],
    },

    // SECTION 3: Tự động hóa (Home users)
    {
      title: 'Tự động hóa',
      items: [
        {
          icon: Zap,
          label: 'Tự động hóa',
          path: '/automations',
          permission: HOME_PERMISSIONS.AUTOMATION_VIEW,
        },
        {
          icon: Clapperboard,
          label: 'Ngữ cảnh',
          path: '/scenes',
          permission: HOME_PERMISSIONS.SCENE_VIEW,
        },
      ],
    },

    // SECTION 4: Quản lý thành viên & logs (Home users có quyền)
    {
      title: 'Quản lý',
      items: [
        {
          icon: Users,
          label: 'Thành viên',
          path: '/members',
          permission: HOME_PERMISSIONS.MEMBER_VIEW,
        },
        {
          icon: History,
          label: 'Nhật ký hoạt động',
          path: '/logs',
          permission: HOME_PERMISSIONS.HOME_LOGS_VIEW,
        },
        {
          icon: Settings,
          label: 'Cài đặt nhà',
          path: '/settings',
          permission: HOME_PERMISSIONS.HOME_SETTINGS_VIEW,
        },
      ],
    },

    // SECTION 5: ADMIN HỆ THỐNG (Chỉ hiện cho ADMIN)
    {
      title: 'Quản trị hệ thống',
      systemOnly: true, // Flag để check
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
  ];

  // ============================================
  // LỌC ITEMS THEO QUYỀN
  // ============================================
  const canUseHomeSidebar = isAdmin || homeRole === 'OWNER';
  const filterItems = (items: NavItem[]): NavItem[] => {
    return items.filter(item => {
      // Nếu item chỉ dành cho Admin hệ thống
      if (item.systemOnly && !isAdmin) {
        return false;
      }

      // Admin hệ thống thấy tất cả
      if (isAdmin) return true;

      // Không có permission requirement = hiện cho tất cả
      if (!item.permission) return true;

      // Check permission
      return can(item.permission as any);
    });
  };

  // Lọc sections
  const visibleSections = useMemo(() => {
      const canUseHomeSidebar = isAdmin || homeRole === 'OWNER';
      
      return allSections
        .filter(section => {
          // ADMIN hệ thống → thấy tất cả
          if (isAdmin) return true;

          // Section chỉ dành cho ADMIN
          if (section.systemOnly) return false;

          // Sidebar HOME chỉ cho OWNER
          if (!canUseHomeSidebar) return false;

          return true;
        })
        .map(section => ({
          ...section,
          items: filterItems(section.items),
        }))
        .filter(section => section.items.length > 0);
    }, [isAdmin, homeRole]);

    useEffect(() => {
    console.log('Sidebar rendering:', {
      isAdmin,
      hasHomeAccess,
      homeRole,
      sectionsCount: visibleSections.length
    });
  }, [isAdmin, hasHomeAccess, homeRole, visibleSections.length]);


  // ============================================
  // RENDER
  // ============================================
  return (
    <div
      className={cn(
        'bg-background h-full flex flex-col',
        isMobile
          ? 'w-full border-0'
          : 'w-64 border-r fixed h-screen left-0 top-0 hidden md:flex'
      )}
    >
      {/* LOGO & ROLE INDICATOR */}
      <div className="flex h-16 items-center border-b px-6">
        <Zap className="mr-2 h-6 w-6 text-primary" />
        <div className="flex flex-col">
          <span className="text-lg font-bold tracking-tight">SmartHome</span>
          {isAdmin && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-blue-500" />
              System Admin
            </span>
          )}
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
        {/* Thông báo nếu user chưa có home */}
        {!hasHomeAccess && !isAdmin && (
          <div className="px-3 py-8 text-center text-sm text-muted-foreground">
            <Home className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Chọn hoặc tạo nhà để bắt đầu</p>
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
                      'w-full justify-start gap-3 h-10 relative',
                      isActive && 'bg-secondary font-semibold text-primary'
                    )
                  }
                  title={item.description}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate flex-1">{item.label}</span>
                  {item.badge && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </NavLink>
              ))}
            </div>

            {sectionIndex < visibleSections.length - 1 && (
              <Separator className="my-4 mx-3" />
            )}
          </div>
        ))}
      </div>

      {/* FOOTER - LOGOUT */}
      <div className="border-t p-3">
        <button
          onClick={logout}
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'w-full justify-start gap-3 h-10',
            'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950'
          )}
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    </div>
  );
}