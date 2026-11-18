"use client";

import {
  ArrowLeftRight,
  ChartColumn,
  LayoutDashboard,
  Users,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/BrandLogo";

interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navigationItems: NavigationItem[] = [
  { label: "Genel Bakış", href: "/", icon: LayoutDashboard },
  { label: "Müşteriler", href: "/customers", icon: Users },
  { label: "Hesaplar", href: "/accounts", icon: Wallet },
  { label: "İşlemler", href: "/transactions", icon: ArrowLeftRight },
  { label: "Raporlar", href: "/reports", icon: ChartColumn },
];

const isActivePath = (pathname: string, href: string): boolean => {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};

interface SidebarNavigationProps {
  /** Mobil menüde bir bağlantıya tıklanınca menüyü kapatmak için. */
  onNavigate?: () => void;
}

/** Menü bağlantıları. Hem masaüstü kenar çubuğunda hem mobil menüde kullanılır. */
export const SidebarNavigation = ({ onNavigate }: SidebarNavigationProps) => {
  const pathname = usePathname();

  return (
    <nav aria-label="Ana menü" className="flex flex-col gap-1">
      {navigationItems.map((item) => {
        const isActive = isActivePath(pathname, item.href);
        const Icon = item.icon;

        const stateClasses = isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground";

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${stateClasses}`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
};

/** Masaüstü kenar çubuğu (lg ve üzeri ekranlarda görünür). */
export const Sidebar = () => {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card lg:flex">
      <div className="flex h-16 items-center border-b px-5">
        <BrandLogo />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-3 text-xs font-medium tracking-wider text-muted-foreground uppercase">
          Menü
        </p>
        <SidebarNavigation />
      </div>

      <div className="border-t px-5 py-4 text-xs text-muted-foreground">
        Tüm tutarlar TRY cinsindendir.
      </div>
    </aside>
  );
};
