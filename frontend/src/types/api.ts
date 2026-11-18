// Backend API'sinin istek ve yanıt tipleri.
// Parasal değerler hassasiyet kaybı olmaması için backend'den string olarak
// gelir (ör. "1250.50") ve string olarak gönderilir; number'a çevrilmemelidir.

// ---- Ortak ----

export type SortOrder = "asc" | "desc";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<Item> {
  data: Item[];
  meta: PaginationMeta;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortOrder?: SortOrder;
}

/** Backend'in standart hata yanıtı. */
export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}

// ---- Auth ----

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: "Bearer";
  /** Token geçerlilik süresi (saniye). */
  expiresIn: number;
}

// ---- Customers ----

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  email: string;
}

export type UpdateCustomerRequest = Partial<CreateCustomerRequest>;

export interface CustomerListQuery extends PaginationQuery {
  sortBy?: "createdAt" | "firstName" | "lastName" | "email";
  search?: string;
}

// ---- Accounts ----

export type AccountStatus = "ACTIVE" | "PASSIVE";

/** Hesap yanıtlarında yer alan hesap sahibi bilgisi. */
export interface AccountCustomer {
  id: string;
  firstName: string;
  lastName: string;
}

export interface Account {
  id: string;
  customerId: string;
  customer: AccountCustomer;
  accountNumber: string;
  balance: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountRequest {
  customerId: string;
}

export interface UpdateAccountStatusRequest {
  status: AccountStatus;
}

export interface AccountListQuery extends PaginationQuery {
  sortBy?: "createdAt" | "accountNumber" | "balance";
  /** Hesap numarası, müşteri adı veya soyadı (kelime kelime) */
  search?: string;
  customerId?: string;
  status?: AccountStatus;
}

// ---- Transactions ----

export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
export type TransactionStatus = "PENDING" | "SUCCESS" | "FAILED";

export interface Transaction {
  id: string;
  transactionNumber: string;
  sourceAccountId: string | null;
  targetAccountId: string | null;
  /** Kaynak hesap numarası (para yatırmada null) */
  sourceAccountNumber: string | null;
  /** Hedef hesap numarası (para çekmede null) */
  targetAccountNumber: string | null;
  amount: string;
  type: TransactionType;
  status: TransactionStatus;
  failureReason: string | null;
  createdAt: string;
}

export interface DepositRequest {
  accountId: string;
  amount: string;
}

export type WithdrawRequest = DepositRequest;

export interface TransferRequest {
  sourceAccountId: string;
  targetAccountId: string;
  amount: string;
}

export interface TransactionListQuery extends PaginationQuery {
  sortBy?: "createdAt" | "amount";
  search?: string;
  accountId?: string;
  type?: TransactionType;
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
  minAmount?: string;
  maxAmount?: string;
}

// ---- Reports ----

export interface ReportPeriodQuery {
  /** YYYY-MM-DD, Europe/Istanbul */
  startDate?: string;
  /** YYYY-MM-DD, Europe/Istanbul */
  endDate?: string;
}

export type VolumeInterval = "daily" | "weekly" | "monthly";

export interface VolumeQuery extends ReportPeriodQuery {
  interval?: VolumeInterval;
}

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
  customers: { total: number };
  accounts: {
    total: number;
    active: number;
    passive: number;
    totalBalance: string;
  };
  moneyFlow: {
    totalInflow: string;
    totalOutflow: string;
    netFlow: string;
    transfers: AmountAndCount;
  };
}

export interface VolumePoint {
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
