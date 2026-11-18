import { readSession } from "@/lib/session";
import type { ApiErrorResponse } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/**
 * Korumalı bir istek 401 döndüğünde yayınlanan olay.
 * AuthContext bu olayı dinleyerek oturumu kapatır.
 */
export const UNAUTHORIZED_EVENT = "fts:unauthorized";

const NETWORK_ERROR_MESSAGE =
  "Sunucuya ulaşılamıyor. Lütfen bağlantınızı kontrol edip tekrar deneyin.";
const SERVER_ERROR_MESSAGE =
  "Beklenmeyen bir sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.";

/** API isteklerinde oluşan hatalar. status 0 ise sunucuya hiç ulaşılamamıştır. */
export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];

  constructor(status: number, messages: string[]) {
    super(messages.join(" "));
    this.name = "ApiError";
    this.status = status;
    this.messages = messages;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  /** Query string parametreleri; boş veya undefined değerler gönderilmez. */
  query?: object;
  /** false ise Authorization başlığı eklenmez (ör. login). */
  authenticated?: boolean;
}

const buildUrl = (path: string, query?: object): string => {
  const url = new URL(path, API_BASE_URL);

  if (query) {
    const entries = Object.entries(query) as [string, unknown][];

    for (const [key, value] of entries) {
      const hasValue = value !== undefined && value !== null && value !== "";
      if (hasValue) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
};

const readErrorMessages = async (response: Response): Promise<string[]> => {
  if (response.status >= 500) {
    return [SERVER_ERROR_MESSAGE];
  }

  try {
    const errorBody = (await response.json()) as ApiErrorResponse;

    if (Array.isArray(errorBody.message)) {
      return errorBody.message;
    }
    if (errorBody.message) {
      return [errorBody.message];
    }
  } catch {
    // Yanıt JSON değilse aşağıdaki genel mesaj kullanılır.
  }

  return [`İstek başarısız oldu (HTTP ${response.status}).`];
};

/**
 * Tüm backend istekleri bu fonksiyon üzerinden yapılır.
 * Token'ı ekler, hataları ApiError'a çevirir ve 401 durumunu AuthContext'e bildirir.
 */
export const apiRequest = async <ResponseBody>(
  path: string,
  options: RequestOptions = {},
): Promise<ResponseBody> => {
  const method = options.method ?? "GET";
  const isAuthenticated = options.authenticated ?? true;

  const headers: Record<string, string> = { Accept: "application/json" };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (isAuthenticated) {
    const session = readSession();
    if (session) {
      headers.Authorization = `Bearer ${session.accessToken}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, [NETWORK_ERROR_MESSAGE]);
  }

  if (response.status === 401 && isAuthenticated) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }

  if (!response.ok) {
    const messages = await readErrorMessages(response);
    throw new ApiError(response.status, messages);
  }

  return (await response.json()) as ResponseBody;
};

/** Hata nesnesinden kullanıcıya gösterilecek mesajı üretir. */
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    return error.message;
  }
  return SERVER_ERROR_MESSAGE;
};
