import { AccountStatus, TransactionType } from '@prisma/client';
import { VolumeInterval } from './dto/volume-query.dto';

// Tüm parasal değerler 2 ondalık basamaklı string'dir (ör. "1250.50").

export interface ReportPeriod {
  startDate: string | null;
  endDate: string | null;
  timeZone: string;
}

export interface AmountAndCount {
  amount: string;
  count: number;
}

export interface SummaryReport {
  period: ReportPeriod;
  /** Anlık değerler: tarih aralığından etkilenmez. */
  customers: { total: number };
  /** Anlık değerler: tarih aralığından etkilenmez. */
  accounts: {
    total: number;
    active: number;
    passive: number;
    totalBalance: string;
  };
  /** Yalnızca SUCCESS işlemler; transferler giriş/çıkışa dahil edilmez. */
  moneyFlow: {
    totalInflow: string;
    totalOutflow: string;
    netFlow: string;
    transfers: AmountAndCount;
  };
}

export interface VolumePoint {
  /** Periyodun ilk günü (Europe/Istanbul), ör. haftalıkta pazartesi. */
  periodStart: string;
  transactionCount: number;
  depositAmount: string;
  withdrawalAmount: string;
  transferAmount: string;
}

export interface VolumeReport {
  interval: VolumeInterval;
  period: ReportPeriod;
  data: VolumePoint[];
}

export interface AccountReport {
  account: {
    id: string;
    accountNumber: string;
    customerId: string;
    status: AccountStatus;
    /** Anlık bakiye: tarih aralığından etkilenmez. */
    balance: string;
  };
  period: ReportPeriod;
  incoming: {
    total: string;
    deposits: AmountAndCount;
    transfers: AmountAndCount;
  };
  outgoing: {
    total: string;
    withdrawals: AmountAndCount;
    transfers: AmountAndCount;
  };
  netFlow: string;
}

export interface StatusCounts {
  total: number;
  success: number;
  failed: number;
  pending: number;
}

export interface TypeStats extends StatusCounts {
  successAmount: string;
  averageSuccessAmount: string;
}

export interface TransactionStatsReport {
  period: ReportPeriod;
  byStatus: StatusCounts;
  byType: Record<TransactionType, TypeStats>;
}
