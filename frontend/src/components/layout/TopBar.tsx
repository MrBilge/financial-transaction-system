"use client";

import { LogOut, Menu } from "lucide-react";
import { useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { SidebarNavigation } from "@/components/layout/Sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";

/** Üst çubuk: mobil menü butonu ve kullanıcı menüsü. */
export const TopBar = () => {
  const { session, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const username = session?.username ?? "";
  const userInitial = username.charAt(0).toLocaleUpperCase("tr-TR");

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Oturum kapanınca DashboardShell kullanıcıyı login sayfasına yönlendirir.
  const handleLogout = () => {
    logout();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card/90 px-4 backdrop-blur sm:px-6">
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu aria-hidden="true" />
            <span className="sr-only">Menüyü aç</span>
          </Button>
        </SheetTrigger>

        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle asChild>
              <div>
                <BrandLogo />
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">
              Sayfalar arasında gezinme menüsü
            </SheetDescription>
          </SheetHeader>
          <div className="px-3">
            <SidebarNavigation onNavigate={closeMobileMenu} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="lg:hidden">
        <BrandLogo />
      </div>

      <div className="ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-10 gap-3 px-2"
              aria-label="Kullanıcı menüsü"
            >
              <Avatar>
                <AvatarFallback className="bg-primary/10 font-medium text-primary">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-medium">{username}</span>
                <span className="block text-xs text-muted-foreground">
                  Yönetici
                </span>
              </span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
              <LogOut aria-hidden="true" />
              Çıkış Yap
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
