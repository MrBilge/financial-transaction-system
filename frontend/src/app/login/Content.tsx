"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { use, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { browser } from "react-dom";

import { getErrorMessage } from "@/api/client";
import { BrandLogo } from "@/components/BrandLogo";
import { LoadingState } from "@/components/LoadingState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";

const DEFAULT_REDIRECT_PATH = "/";

/**
 * Girişten sonra yönlendirilecek adres. Yalnızca uygulama içi yollara izin
 * verilir; "//evil.com" veya "https://..." gibi dış adreslere yönlendirme
 * (open redirect) engellenir.
 */
const getSafeRedirectPath = (nextParam: string | null): string => {
  if (!nextParam) {
    return DEFAULT_REDIRECT_PATH;
  }

  const isInternalPath = nextParam.startsWith("/") && !nextParam.startsWith("//");
  const isLoginPath = nextParam.startsWith("/login");

  if (!isInternalPath || isLoginPath) {
    return DEFAULT_REDIRECT_PATH;
  }

  return nextParam;
};

export const Content = () => {
  // Oturum açıksa yönlendirme yapılacağı için yalnızca tarayıcıda render edilir.
  use(browser("Oturum bilgisi tarayıcının sessionStorage alanında tutulur."));

  const { session, isSessionExpired, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectPath = getSafeRedirectPath(searchParams.get("next"));
  const isAlreadyLoggedIn = session !== null;

  const togglePasswordVisibility = () => {
    setIsPasswordVisible((isVisible) => !isVisible);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setErrorMessage("Kullanıcı adı ve parola zorunludur.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login(trimmedUsername, password);
      router.replace(redirectPath);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Oturumu açık olan kullanıcı login sayfasına gelirse panele yönlendirilir.
  useEffect(() => {
    if (isAlreadyLoggedIn) {
      router.replace(redirectPath);
    }
  }, [isAlreadyLoggedIn, redirectPath, router]);

  if (isAlreadyLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingState message="Yönlendiriliyor..." />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[5fr_7fr]">
      <section className="hidden flex-col justify-between border-r border-white/10 bg-[oklch(0.22_0.05_262)] px-12 py-10 text-white lg:flex">
        <BrandLogo inverted />

        <div className="max-w-sm space-y-4">
          <div className="h-px w-10 bg-white/40" aria-hidden="true" />
          <h1 className="text-2xl leading-snug font-medium tracking-tight">
            Müşteri, hesap ve finansal işlem yönetimi
          </h1>
        </div>

        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} Finans Paneli
        </p>
      </section>

      <section className="flex items-center justify-center bg-muted/40 px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <BrandLogo />
          </div>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl">Giriş Yap</CardTitle>
              <CardDescription>
                Devam etmek için kullanıcı adınızı ve parolanızı girin.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                {isSessionExpired && !errorMessage && (
                  <Alert>
                    <AlertDescription>
                      Oturumunuzun süresi doldu. Lütfen tekrar giriş yapın.
                    </AlertDescription>
                  </Alert>
                )}

                {errorMessage && (
                  <Alert variant="destructive">
                    <AlertDescription>{errorMessage}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username">Kullanıcı adı</Label>
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    autoFocus
                    maxLength={100}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    disabled={isSubmitting}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Parola</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={isPasswordVisible ? "text" : "password"}
                      autoComplete="current-password"
                      maxLength={72}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={isSubmitting}
                      className="pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={togglePasswordVisibility}
                      className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
                      aria-label={isPasswordVisible ? "Parolayı gizle" : "Parolayı göster"}
                    >
                      {isPasswordVisible ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Spinner aria-hidden="true" />}
                  {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};
