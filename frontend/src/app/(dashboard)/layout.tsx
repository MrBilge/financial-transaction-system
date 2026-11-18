import { Suspense } from "react";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { LoadingState } from "@/components/LoadingState";

// (dashboard) bir route grubudur: URL'e eklenmez, yalnızca panel sayfalarını
// ortak iskelet (kenar çubuğu + üst çubuk + oturum kontrolü) altında toplar.
// DashboardShell oturumu tarayıcıda okuduğu için sunucu çıktısında bu
// Suspense fallback'i gösterilir.
const DashboardLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoadingState message="Oturum kontrol ediliyor..." />
        </div>
      }
    >
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
};

export default DashboardLayout;
