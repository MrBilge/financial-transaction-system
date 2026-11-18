import { apiRequest } from "@/api/client";
import type {
  AccountReport,
  ReportPeriodQuery,
  SummaryReport,
  TransactionStatsReport,
  VolumeQuery,
  VolumeReport,
} from "@/types/api";

export const getSummaryReport = (
  query: ReportPeriodQuery = {},
): Promise<SummaryReport> => {
  return apiRequest<SummaryReport>("/reports/summary", { query });
};

export const getVolumeReport = (
  query: VolumeQuery = {},
): Promise<VolumeReport> => {
  return apiRequest<VolumeReport>("/reports/volume", { query });
};

export const getAccountReport = (
  accountId: string,
  query: ReportPeriodQuery = {},
): Promise<AccountReport> => {
  return apiRequest<AccountReport>(
    `/reports/accounts/${encodeURIComponent(accountId)}`,
    { query },
  );
};

export const getTransactionStatsReport = (
  query: ReportPeriodQuery = {},
): Promise<TransactionStatsReport> => {
  return apiRequest<TransactionStatsReport>("/reports/transaction-stats", {
    query,
  });
};
