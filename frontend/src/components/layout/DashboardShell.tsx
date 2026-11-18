"use client";

import { usePathname, useRouter } from "next/navigation";
import { use, useEffect } from "react";
import type { ReactNode } from "react";
import { browser } from "react-dom";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { LoadingState } from "@/components/LoadingState";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardShellProps {
  children: ReactNode;
}

/**
 * Panel iskeleti: kenar çubuğu, üst çubuk ve sayfa içeriği.
 * Oturum yoksa kullanıcıyı login sayfasına yönlendirir; sayfa içeriği
 * (ve API çağrıları) yalnızca oturum doğrulandıktan sonra render edilir.
 */
export const DashboardShell = ({ children }: DashboardShellProps) => {
  // Oturum sessionStorage'da olduğu için iskelet yalnızca tarayıcıda render
  // edilir; sunucu çıktısında layout'taki Suspense fallback'i gösterilir.
  use(browser("Oturum bilgisi tarayıcının sessionStorage alanında tutulur."));

  const { session } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = session !== null;

  useEffect(() => {
    if (isAuthenticated) {
      return;
    }

    const loginUrl = `/login?next=${encodeURIComponent(pathname)}`;
    router.replace(loginUrl);
  }, [isAuthenticated, pathname, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState message="Giriş sayfasına yönlendiriliyor..." />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/40">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
};
