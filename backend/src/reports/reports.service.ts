import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { toMoneyString } from '../common/money';
import { SNAPSHOT_READ } from '../common/pagination';
import { PrismaService } from '../prisma/prisma.service';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto';
import { VolumeQueryDto } from './dto/volume-query.dto';
import {
  assertValidDateRange,
  createdAtInPeriod,
  REPORT_TIME_ZONE,
  resolveVolumeRange,
  sqlWhere,
} from './report-period';
import {
  AccountReport,
  AmountAndCount,
  ReportPeriod,
  SummaryReport,
  TransactionStatsReport,
  TypeStats,
  VolumeReport,
} from './reports.types';

// Ham SQL satırları: numeric -> Prisma.Decimal, ::int -> number.
interface AccountTotalsRow {
  total: number;
  active: number;
  passive: number;
  total_balance: Prisma.Decimal;
}

interface MoneyFlowRow {
  total_inflow: Prisma.Decimal;
  total_outflow: Prisma.Decimal;
  net_flow: Prisma.Decimal;
  transfer_amount: Prisma.Decimal;
  transfer_count: number;
}

interface VolumeRow {
  period_start: string;
  transaction_count: number;
  deposit_amount: Prisma.Decimal;
  withdrawal_amount: Prisma.Decimal;
  transfer_amount: Prisma.Decimal;
}

interface AccountFlowRow {
  deposit_amount: Prisma.Decimal;
  deposit_count: number;
  transfer_in_amount: Prisma.Decimal;
  transfer_in_count: number;
  withdrawal_amount: Prisma.Decimal;
  withdrawal_count: number;
  transfer_out_amount: Prisma.Decimal;
  transfer_out_count: number;
  total_incoming: Prisma.Decimal;
  total_outgoing: Prisma.Decimal;
  net_flow: Prisma.Decimal;
}

interface TypeStatsRow {
  type: TransactionType | null; // ROLLUP genel toplam satırında null
  total_count: number;
  success_count: number;
  failed_count: number;
  pending_count: number;
  success_amount: Prisma.Decimal;
  average_success_amount: Prisma.Decimal;
}

// Finansal toplamlar yalnızca başarılı işlemlerden hesaplanır.
const SUCCESS_ONLY = Prisma.sql`status = 'SUCCESS'`;

const VOLUME_UNITS = {
  daily: 'day',
  weekly: 'week',
  monthly: 'month',
} as const;

/**
 * Tüm hesaplamalar PostgreSQL'de (SUM, COUNT, GROUP BY, FILTER) yapılır;
 * uygulamaya yalnızca birkaç satırlık özet sonuç gelir. Birden fazla sorgudan
 * oluşan raporlar REPEATABLE READ ile tek snapshot'tan okunur. Tek sorgudan
 * oluşan raporlar zaten tek bir tutarlı snapshot üzerinde çalışır.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(query: ReportPeriodQueryDto): Promise<SummaryReport> {
    assertValidDateRange(query);

    const [customerCount, [accounts], [flow]] = await this.prisma.$transaction(
      [
        this.prisma.customer.count(),
        this.prisma.$queryRaw<AccountTotalsRow[]>`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'ACTIVE')::int AS active,
            COUNT(*) FILTER (WHERE status = 'PASSIVE')::int AS passive,
            COALESCE(SUM(balance), 0) AS total_balance
          FROM accounts`,
        // Transfer sistem içi bir harekettir: toplam giriş/çıkışa eklenirse
        // aynı para iki kez sayılır. Bu yüzden ayrı raporlanır.
        this.prisma.$queryRaw<MoneyFlowRow[]>`
          SELECT
            COALESCE(SUM(amount) FILTER (WHERE type = 'DEPOSIT'), 0) AS total_inflow,
            COALESCE(SUM(amount) FILTER (WHERE type = 'WITHDRAWAL'), 0) AS total_outflow,
            COALESCE(SUM(CASE type WHEN 'DEPOSIT' THEN amount
                                   WHEN 'WITHDRAWAL' THEN -amount
                                   ELSE 0 END), 0) AS net_flow,
            COALESCE(SUM(amount) FILTER (WHERE type = 'TRANSFER'), 0) AS transfer_amount,
            COUNT(*) FILTER (WHERE type = 'TRANSFER')::int AS transfer_count
          FROM transactions
          ${sqlWhere([SUCCESS_ONLY, ...createdAtInPeriod(query)])}`,
      ],
      SNAPSHOT_READ,
    );

    return {
      period: toReportPeriod(query),
      customers: { total: customerCount },
      accounts: {
        total: accounts.total,
        active: accounts.active,
        passive: accounts.passive,
        totalBalance: toMoneyString(accounts.total_balance),
      },
      moneyFlow: {
        totalInflow: toMoneyString(flow.total_inflow),
        totalOutflow: toMoneyString(flow.total_outflow),
        netFlow: toMoneyString(flow.net_flow),
        transfers: amountAndCount(flow.transfer_amount, flow.transfer_count),
      },
    };
  }

  /**
   * Periyot bazlı başarılı işlem hacmi. generate_series ile aralıktaki tüm
   * periyotlar üretilir ve işlemlerle LEFT JOIN yapılır; böylece işlem olmayan
   * periyotlar da sıfır değerlerle döner.
   */
  async getVolume(query: VolumeQueryDto): Promise<VolumeReport> {
    const range = resolveVolumeRange(query);
    const unit = VOLUME_UNITS[query.interval];

    const rows = await this.prisma.$queryRaw<VolumeRow[]>`
      WITH buckets AS (
        SELECT generate_series(
          date_trunc(${unit}, ${range.startDate}::date::timestamp),
          date_trunc(${unit}, ${range.endDate}::date::timestamp),
          ${`1 ${unit}`}::interval
        ) AS bucket
      ),
      successful AS (
        SELECT type, amount,
               date_trunc(${unit}, created_at AT TIME ZONE ${REPORT_TIME_ZONE}) AS bucket
        FROM transactions
        ${sqlWhere([SUCCESS_ONLY, ...createdAtInPeriod(range)])}
      )
      SELECT
        to_char(b.bucket, 'YYYY-MM-DD') AS period_start,
        COUNT(s.type)::int AS transaction_count,
        COALESCE(SUM(s.amount) FILTER (WHERE s.type = 'DEPOSIT'), 0) AS deposit_amount,
        COALESCE(SUM(s.amount) FILTER (WHERE s.type = 'WITHDRAWAL'), 0) AS withdrawal_amount,
        COALESCE(SUM(s.amount) FILTER (WHERE s.type = 'TRANSFER'), 0) AS transfer_amount
      FROM buckets b
      LEFT JOIN successful s ON s.bucket = b.bucket
      GROUP BY b.bucket
      ORDER BY b.bucket`;

    return {
      interval: query.interval,
      period: toReportPeriod(range),
      data: rows.map((row) => ({
        periodStart: row.period_start,
        transactionCount: row.transaction_count,
        depositAmount: toMoneyString(row.deposit_amount),
        withdrawalAmount: toMoneyString(row.withdrawal_amount),
        transferAmount: toMoneyString(row.transfer_amount),
      })),
    };
  }

  /**
   * Hesabın başarılı para hareketleri. Transferler, hesabın kaynak mı hedef mi
   * olduğuna göre giden veya gelen hareket olarak sayılır.
   */
  async getAccountReport(
    accountId: string,
    query: ReportPeriodQueryDto,
  ): Promise<AccountReport> {
    assertValidDateRange(query);
    const isTarget = Prisma.sql`target_account_id = ${accountId}::uuid`;
    const isSource = Prisma.sql`source_account_id = ${accountId}::uuid`;

    const [account, [flow]] = await this.prisma.$transaction(
      [
        this.prisma.account.findUnique({ where: { id: accountId } }),
        this.prisma.$queryRaw<AccountFlowRow[]>`
          SELECT
            COALESCE(SUM(amount) FILTER (WHERE type = 'DEPOSIT'), 0) AS deposit_amount,
            COUNT(*) FILTER (WHERE type = 'DEPOSIT')::int AS deposit_count,
            COALESCE(SUM(amount) FILTER (WHERE type = 'TRANSFER' AND ${isTarget}), 0) AS transfer_in_amount,
            COUNT(*) FILTER (WHERE type = 'TRANSFER' AND ${isTarget})::int AS transfer_in_count,
            COALESCE(SUM(amount) FILTER (WHERE type = 'WITHDRAWAL'), 0) AS withdrawal_amount,
            COUNT(*) FILTER (WHERE type = 'WITHDRAWAL')::int AS withdrawal_count,
            COALESCE(SUM(amount) FILTER (WHERE type = 'TRANSFER' AND ${isSource}), 0) AS transfer_out_amount,
            COUNT(*) FILTER (WHERE type = 'TRANSFER' AND ${isSource})::int AS transfer_out_count,
            COALESCE(SUM(amount) FILTER (WHERE ${isTarget}), 0) AS total_incoming,
            COALESCE(SUM(amount) FILTER (WHERE ${isSource}), 0) AS total_outgoing,
            COALESCE(SUM(CASE WHEN ${isTarget} THEN amount ELSE -amount END), 0) AS net_flow
          FROM transactions
          ${sqlWhere([
            SUCCESS_ONLY,
            Prisma.sql`(${isSource} OR ${isTarget})`,
            ...createdAtInPeriod(query),
          ])}`,
      ],
      SNAPSHOT_READ,
    );

    if (!account) {
      throw new NotFoundException(`Hesap bulunamadı: ${accountId}`);
    }

    return {
      account: {
        id: account.id,
        accountNumber: account.accountNumber,
        customerId: account.customerId,
        status: account.status,
        balance: toMoneyString(account.balance),
      },
      period: toReportPeriod(query),
      incoming: {
        total: toMoneyString(flow.total_incoming),
        deposits: amountAndCount(flow.deposit_amount, flow.deposit_count),
        transfers: amountAndCount(
          flow.transfer_in_amount,
          flow.transfer_in_count,
        ),
      },
      outgoing: {
        total: toMoneyString(flow.total_outgoing),
        withdrawals: amountAndCount(
          flow.withdrawal_amount,
          flow.withdrawal_count,
        ),
        transfers: amountAndCount(
          flow.transfer_out_amount,
          flow.transfer_out_count,
        ),
      },
      netFlow: toMoneyString(flow.net_flow),
    };
  }

  /**
   * Durum ve tür bazlı işlem istatistikleri. Sayılar tüm durumları kapsar,
   * tutarlar yalnızca başarılı işlemlerden hesaplanır. GROUP BY ROLLUP tür
   * bazlı satırlara ek olarak genel toplam satırını da veritabanında üretir.
   */
  async getTransactionStats(
    query: ReportPeriodQueryDto,
  ): Promise<TransactionStatsReport> {
    assertValidDateRange(query);

    const rows = await this.prisma.$queryRaw<TypeStatsRow[]>`
      SELECT
        type,
        COUNT(*)::int AS total_count,
        COUNT(*) FILTER (WHERE status = 'SUCCESS')::int AS success_count,
        COUNT(*) FILTER (WHERE status = 'FAILED')::int AS failed_count,
        COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_count,
        COALESCE(SUM(amount) FILTER (WHERE status = 'SUCCESS'), 0) AS success_amount,
        COALESCE(ROUND(AVG(amount) FILTER (WHERE status = 'SUCCESS'), 2), 0) AS average_success_amount
      FROM transactions
      ${sqlWhere(createdAtInPeriod(query))}
      GROUP BY ROLLUP (type)`;

    const totals = rows.find((row) => row.type === null);
    const statsOf = (type: TransactionType): TypeStats => {
      const row = rows.find((r) => r.type === type);
      return {
        ...statusCounts(row),
        successAmount: toMoneyString(row?.success_amount ?? ZERO),
        averageSuccessAmount: toMoneyString(
          row?.average_success_amount ?? ZERO,
        ),
      };
    };

    return {
      period: toReportPeriod(query),
      byStatus: statusCounts(totals),
      byType: {
        DEPOSIT: statsOf(TransactionType.DEPOSIT),
        WITHDRAWAL: statsOf(TransactionType.WITHDRAWAL),
        TRANSFER: statsOf(TransactionType.TRANSFER),
      },
    };
  }
}

const ZERO = new Prisma.Decimal(0);

function toReportPeriod({
  startDate,
  endDate,
}: ReportPeriodQueryDto): ReportPeriod {
  return {
    startDate: startDate ?? null,
    endDate: endDate ?? null,
    timeZone: REPORT_TIME_ZONE,
  };
}

function amountAndCount(amount: Prisma.Decimal, count: number): AmountAndCount {
  return { amount: toMoneyString(amount), count };
}

/** Veri yoksa (satır bulunmazsa) sıfır değerler döner. */
function statusCounts(row?: TypeStatsRow) {
  return {
    total: row?.total_count ?? 0,
    success: row?.success_count ?? 0,
    failed: row?.failed_count ?? 0,
    pending: row?.pending_count ?? 0,
  };
}
