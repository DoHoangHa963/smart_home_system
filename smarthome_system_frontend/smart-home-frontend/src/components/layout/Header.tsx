// components/layout/Header.tsx
import { Bell, Search, Menu, Zap, ChevronsUpDown, Check, PlusCircle, LogOut, Home } from 'lucide-react'; // Đã thêm icon Home
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useTheme } from "@/components/theme-provider";
import { Sun, Moon } from "lucide-react";
import { useAuthStore } from '@/store/authStore';
import { useHomeStore } from '@/store/homeStore';
import { usePermission } from '@/hooks/usePermission';
import { useEffect } from 'react';
import CreateHomeModal from '@/pages/home/CreateHomeModal';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import Sidebar from './Sidebar';

export default function Header() {
  const navigate = useNavigate();
  const { setTheme, theme } = useTheme();
  const { user, logout } = useAuthStore();
  const { homes, currentHome, setCurrentHome, fetchMyHomes } = useHomeStore();
  const { isAdmin } = usePermission();
  const [openCombobox, setOpenCombobox] = useState(false);
  const [openTheme, setOpenTheme] = useState(false);
  const [openMobileHome, setOpenMobileHome] = useState(false); // State mới cho mobile home selector

  const handleHomeSelect = async (home: any) => {
    await setCurrentHome(home);
    setOpenCombobox(false);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 px-3 sm:px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* MOBILE MENU TRIGGER */}
      <div className="flex items-center md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="-ml-2">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[300px] p-0">
            <div className="h-full overflow-y-auto">
              <Sidebar isMobile />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* SEARCH BAR */}
      <div className="flex items-center gap-2 rounded-md border bg-muted/60 px-3 h-9 w-full max-w-sm focus-within:ring-1 focus-within:ring-ring">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          placeholder="Tìm thiết bị, phòng"
          className="w-full bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground/70"
        />
      </div>

      {/* RIGHT ACTIONS */}
      <div className="flex items-center gap-2 ml-auto">
        {/* HOME SELECTOR - CHỈ HIỂN THỊ CHO USER THƯỜNG */}
        {!isAdmin && (
          <div className="hidden sm:flex items-center">
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-[200px] justify-between"
                >
                  {currentHome ? (
                    <span className="truncate">{currentHome.name}</span>
                  ) : (
                    <span className="text-muted-foreground">Chọn nhà...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command>
                  <CommandInput placeholder="Tìm nhà..." />
                  <CommandList>
                    <CommandEmpty>Không tìm thấy nhà.</CommandEmpty>
                    <CommandGroup heading="Nhà của bạn">
                      {homes?.map((home) => (
                        <CommandItem
                          key={home.id}
                          onSelect={() => handleHomeSelect(home)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              currentHome?.id === home.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {home.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    <CommandGroup>
                      <CommandItem onSelect={() => navigate('/select-home')}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Tạo nhà mới
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* ADMIN VIEW - HIỂN THỊ SỐ LƯỢNG NHÀ */}
        {isAdmin && (
          <div className="hidden sm:flex items-center gap-2 px-3">
            <span className="text-sm text-muted-foreground">
              Đang xem: <span className="font-medium">{currentHome?.name || "Tổng quan hệ thống"}</span>
            </span>
          </div>
        )}
          
        {/* ADMIN BADGE */}
        {isAdmin && (
          <Badge variant="secondary" className="hidden sm:flex gap-1">
            <Zap className="h-3 w-3" />
            Admin
          </Badge>
        )}

        {/* Theme Toggle - Desktop */}
        <div className="hidden sm:block">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setTheme("light")}>Sáng</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")}>Tối</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("system")}>Hệ thống</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Notifications - Desktop */}
        <div className="hidden sm:block">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-600 ring-2 ring-background" />
          </Button>
        </div>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9 border">
                <AvatarImage src={user?.avatarUrl || "https://github.com/shadcn.png"} alt={user?.username} />
                <AvatarFallback>{user?.username?.substring(0, 2).toUpperCase() || "US"}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.username}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>Hồ sơ cá nhân</DropdownMenuItem>
              <DropdownMenuItem>Đổi mật khẩu</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />

            {/* MOBILE ONLY */}
            <div className="sm:hidden">
              {!isAdmin && (
                <>
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      setOpenMobileHome(prev => !prev);
                    }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4" />
                      Chọn nhà
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="max-w-[80px] truncate">
                        {currentHome?.name || "Chưa chọn"}
                      </span>
                      <ChevronsUpDown
                        className={cn("h-4 w-4 transition-transform", openMobileHome && "rotate-180")}
                      />
                    </div>
                  </DropdownMenuItem>

                  {openMobileHome && (
                    <div className="pl-8 space-y-1 my-1">
                      {homes?.map((home) => (
                        <DropdownMenuItem 
                          key={home.id} 
                          onClick={() => handleHomeSelect(home)} 
                          className="text-sm cursor-pointer"
                        >
                          {home.name}
                          {currentHome?.id === home.id && <Check className="ml-auto h-4 w-4" />}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/select-home')} className="text-sm cursor-pointer">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Tạo nhà mới
                      </DropdownMenuItem>
                    </div>
                  )}
                </>
              )}
              
              {/* ADMIN MOBILE VIEW */}
              {isAdmin && (
                <DropdownMenuItem className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="text-sm">Chế độ Admin</span>
                    <span className="text-xs text-muted-foreground">
                      {homes?.length || 0} nhà trong hệ thống
                    </span>
                  </div>
                </DropdownMenuItem>
              )}
            </div>

            <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}