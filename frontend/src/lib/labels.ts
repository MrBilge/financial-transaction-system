import type {
  AccountStatus,
  TransactionStatus,
  TransactionType,
} from "@/types/api";

// Backend enum değerlerinin arayüzdeki Türkçe karşılıkları.

export const accountStatusLabels: Record<AccountStatus, string> = {
  ACTIVE: "Aktif",
  PASSIVE: "Pasif",
};

export const transactionTypeLabels: Record<TransactionType, string> = {
  DEPOSIT: "Para Yatırma",
  WITHDRAWAL: "Para Çekme",
  TRANSFER: "Transfer",
};

export const transactionStatusLabels: Record<TransactionStatus, string> = {
  SUCCESS: "Başarılı",
  FAILED: "Başarısız",
  PENDING: "Beklemede",
};
