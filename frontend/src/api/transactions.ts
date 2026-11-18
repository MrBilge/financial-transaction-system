import { apiRequest } from "@/api/client";
import type {
  DepositRequest,
  PaginatedResponse,
  Transaction,
  TransactionListQuery,
  TransferRequest,
  WithdrawRequest,
} from "@/types/api";

export const getTransactions = (
  query: TransactionListQuery = {},
): Promise<PaginatedResponse<Transaction>> => {
  return apiRequest<PaginatedResponse<Transaction>>("/transactions", { query });
};

export const getTransaction = (transactionId: string): Promise<Transaction> => {
  return apiRequest<Transaction>(
    `/transactions/${encodeURIComponent(transactionId)}`,
  );
};

/** Hesabın gelen ve giden işlemleri (accountId path'ten gönderilir). */
export const getAccountTransactions = (
  accountId: string,
  query: Omit<TransactionListQuery, "accountId"> = {},
): Promise<PaginatedResponse<Transaction>> => {
  return apiRequest<PaginatedResponse<Transaction>>(
    `/accounts/${encodeURIComponent(accountId)}/transactions`,
    { query },
  );
};

export const deposit = (request: DepositRequest): Promise<Transaction> => {
  return apiRequest<Transaction>("/transactions/deposit", {
    method: "POST",
    body: request,
  });
};

export const withdraw = (request: WithdrawRequest): Promise<Transaction> => {
  return apiRequest<Transaction>("/transactions/withdraw", {
    method: "POST",
    body: request,
  });
};

export const transfer = (request: TransferRequest): Promise<Transaction> => {
  return apiRequest<Transaction>("/transactions/transfer", {
    method: "POST",
    body: request,
  });
};
