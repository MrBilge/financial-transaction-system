import { apiRequest } from "@/api/client";
import type { LoginRequest, LoginResponse } from "@/types/api";

export const login = (request: LoginRequest): Promise<LoginResponse> => {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: request,
    authenticated: false,
  });
};
