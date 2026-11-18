"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { login as loginRequest } from "@/api/auth";
import { UNAUTHORIZED_EVENT } from "@/api/client";
import {
  clearSession,
  readSession,
  saveSession,
  type StoredSession,
} from "@/lib/session";

interface AuthContextValue {
  session: StoredSession | null;
  /** Oturum, token süresi dolduğu veya geçersiz olduğu için kapatıldıysa true. */
  isSessionExpired: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/** sessionStorage yalnızca tarayıcıda vardır; sunucuda oturum her zaman yoktur. */
const readInitialSession = (): StoredSession | null => {
  const isBrowser = typeof window !== "undefined";
  return isBrowser ? readSession() : null;
};

/**
 * Oturum bilgisini sessionStorage'dan okur ve uygulamaya sağlar.
 *
 * Provider kendisi HTML üretmediği için sunucuda ve tarayıcıda farklı başlangıç
 * değeri olması sorun oluşturmaz. Oturuma göre farklı içerik gösteren
 * component'ler (DashboardShell, login sayfası) ise use(browser()) ile yalnızca
 * tarayıcıda render edilir; böylece sunucu/tarayıcı HTML uyuşmazlığı oluşmaz.
 */
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<StoredSession | null>(
    readInitialSession,
  );
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  const login = async (username: string, password: string) => {
    const response = await loginRequest({ username, password });

    const newSession: StoredSession = {
      accessToken: response.accessToken,
      username,
      expiresAt: Date.now() + response.expiresIn * 1000,
    };

    saveSession(newSession);
    setSession(newSession);
    setIsSessionExpired(false);
  };

  const logout = () => {
    clearSession();
    setSession(null);
  };

  // Token'ın süresi dolduğu anda oturumu kapatır.
  useEffect(() => {
    if (!session) {
      return;
    }

    const remainingTime = session.expiresAt - Date.now();
    const timeoutId = window.setTimeout(() => {
      clearSession();
      setSession(null);
      setIsSessionExpired(true);
    }, remainingTime);

    return () => window.clearTimeout(timeoutId);
  }, [session]);

  // Backend herhangi bir korumalı istekte 401 döndürürse oturumu kapatır.
  useEffect(() => {
    const handleUnauthorized = () => {
      clearSession();
      setSession(null);
      setIsSessionExpired(true);
    };

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    };
  }, []);

  const value: AuthContextValue = {
    session,
    isSessionExpired,
    login,
    logout,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth yalnızca AuthProvider içinde kullanılabilir.");
  }

  return context;
};
