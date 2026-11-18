// Oturum bilgisinin sessionStorage'da saklanması.
// sessionStorage sekmeye özeldir: sayfa yenilense de oturum korunur,
// sekme kapatıldığında token silinir.

const SESSION_STORAGE_KEY = "fts.session";

export interface StoredSession {
  accessToken: string;
  username: string;
  /** Token'ın geçerliliğini yitirdiği an (epoch milisaniye). */
  expiresAt: number;
}

const isStoredSession = (value: unknown): value is StoredSession => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const session = value as Record<string, unknown>;
  return (
    typeof session.accessToken === "string" &&
    typeof session.username === "string" &&
    typeof session.expiresAt === "number"
  );
};

/** Geçerli bir oturum varsa döndürür; süresi dolmuş veya bozuk kaydı temizler. */
export const readSession = (): StoredSession | null => {
  const rawValue = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue);
    const isExpired =
      isStoredSession(parsedValue) && parsedValue.expiresAt <= Date.now();

    if (!isStoredSession(parsedValue) || isExpired) {
      clearSession();
      return null;
    }

    return parsedValue;
  } catch {
    clearSession();
    return null;
  }
};

export const saveSession = (session: StoredSession): void => {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const clearSession = (): void => {
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
};
