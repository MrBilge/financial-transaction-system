import type { Metadata } from "next";
import { Suspense } from "react";

import { LoadingState } from "@/components/LoadingState";

import { Content } from "./Content";

export const metadata: Metadata = {
  title: "Giriş Yap",
};

// Login sayfası anında açılabilmelidir; geliştirme sırasında Next.js bunu doğrular.
export const instant = true;

// Content hem URL'deki "next" parametresini (useSearchParams) hem de
// sessionStorage'daki oturumu okuduğu için Suspense sınırı içinde render edilir.
const LoginPage = () => {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoadingState />
        </div>
      }
    >
      <Content />
    </Suspense>
  );
};

export default LoginPage;
