import { apiRequest } from "@/api/client";
import type {
  Account,
  AccountListQuery,
  CreateAccountRequest,
  PaginatedResponse,
  UpdateAccountStatusRequest,
} from "@/types/api";

export const getAccounts = (
  query: AccountListQuery = {},
): Promise<PaginatedResponse<Account>> => {
  return apiRequest<PaginatedResponse<Account>>("/accounts", { query });
};

export const getAccount = (accountId: string): Promise<Account> => {
  return apiRequest<Account>(`/accounts/${encodeURIComponent(accountId)}`);
};

/** Müşterinin hesapları (customerId path'ten gönderilir). */
export const getCustomerAccounts = (
  customerId: string,
  query: Omit<AccountListQuery, "customerId"> = {},
): Promise<PaginatedResponse<Account>> => {
  return apiRequest<PaginatedResponse<Account>>(
    `/customers/${encodeURIComponent(customerId)}/accounts`,
    { query },
  );
};

export const createAccount = (
  request: CreateAccountRequest,
): Promise<Account> => {
  return apiRequest<Account>("/accounts", { method: "POST", body: request });
};

export const updateAccountStatus = (
  accountId: string,
  request: UpdateAccountStatusRequest,
): Promise<Account> => {
  return apiRequest<Account>(
    `/accounts/${encodeURIComponent(accountId)}/status`,
    { method: "PATCH", body: request },
  );
};
