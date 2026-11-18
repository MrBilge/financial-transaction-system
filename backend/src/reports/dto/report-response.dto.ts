import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from '@prisma/client';
import { ApiMoneyProperty } from '../../common/api-docs';
import { VOLUME_INTERVALS, type VolumeInterval } from './volume-query.dto';
import {
  AccountReport,
  AmountAndCount,
  ReportPeriod,
  StatusCounts,
  SummaryReport,
  TransactionStatsReport,
  TypeStats,
  VolumePoint,
  VolumeReport,
} from '../reports.types';

// Swagger yanıt şemaları. `implements` ile reports.types.ts'teki tiplerle
// uyumları derleme anında denetlenir.

export class ReportPeriodDto implements ReportPeriod {
  @ApiProperty({ type: String, nullable: true, example: '2026-11-01' })
  startDate: string | null;

  @ApiProperty({ type: String, nullable: true, example: '2026-11-30' })
  endDate: string | null;

  @ApiProperty({ example: 'Europe/Istanbul' })
  timeZone: string;
}

export class AmountAndCountDto implements AmountAndCount {
  @ApiMoneyProperty({ example: '1500.00' })
  amount: string;

  @ApiProperty({ example: 3 })
  count: number;
}

// ---- Summary ----

class CustomerTotalsDto {
  @ApiProperty({ example: 42 })
  total: number;
}

class AccountTotalsDto {
  @ApiProperty({ example: 58 })
  total: number;

  @ApiProperty({ example: 55 })
  active: number;

  @ApiProperty({ example: 3 })
  passive: number;

  @ApiMoneyProperty({
    description: 'Tüm hesapların anlık bakiye toplamı',
    example: '1250000.00',
  })
  totalBalance: string;
}

class MoneyFlowDto {
  @ApiMoneyProperty({
    description: 'Başarılı para yatırma toplamı',
    example: '1500000.00',
  })
  totalInflow: string;

  @ApiMoneyProperty({
    description: 'Başarılı para çekme toplamı',
    example: '250000.00',
  })
  totalOutflow: string;

  @ApiMoneyProperty({
    description: 'Giriş - çıkış (negatif olabilir)',
    example: '1250000.00',
  })
  netFlow: string;

  @ApiProperty({
    type: AmountAndCountDto,
    description: 'Hesaplar arası transfer hacmi (giriş/çıkışa dahil değildir)',
  })
  transfers: AmountAndCountDto;
}

export class SummaryReportDto implements SummaryReport {
  @ApiProperty({ type: ReportPeriodDto })
  period: ReportPeriodDto;

  @ApiProperty({
    type: CustomerTotalsDto,
    description: 'Anlık değer; tarih aralığından etkilenmez',
  })
  customers: CustomerTotalsDto;

  @ApiProperty({
    type: AccountTotalsDto,
    description: 'Anlık değerler; tarih aralığından etkilenmez',
  })
  accounts: AccountTotalsDto;

  @ApiProperty({ type: MoneyFlowDto, description: 'Yalnızca SUCCESS işlemler' })
  moneyFlow: MoneyFlowDto;
}

// ---- Volume ----

export class VolumePointDto implements VolumePoint {
  @ApiProperty({
    format: 'date',
    example: '2026-11-17',
    description: "Periyodun ilk günü (haftalıkta pazartesi, aylıkta ayın 1'i)",
  })
  periodStart: string;

  @ApiProperty({ example: 12, description: 'Başarılı işlem sayısı' })
  transactionCount: number;

  @ApiMoneyProperty({ example: '15000.00' })
  depositAmount: string;

  @ApiMoneyProperty({ example: '2500.00' })
  withdrawalAmount: string;

  @ApiMoneyProperty({ example: '4000.00' })
  transferAmount: string;
}

export class VolumeReportDto implements VolumeReport {
  @ApiProperty({ enum: VOLUME_INTERVALS, example: 'daily' })
  interval: VolumeInterval;

  @ApiProperty({ type: ReportPeriodDto })
  period: ReportPeriodDto;

  @ApiProperty({
    type: [VolumePointDto],
    description: 'İşlem olmayan periyotlar sıfır değerlerle döner',
  })
  data: VolumePointDto[];
}

// ---- Account ----

class ReportAccountDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: '4821093756120394' })
  accountNumber: string;

  @ApiProperty({ format: 'uuid' })
  customerId: string;

  @ApiProperty({
    enum: Object.values(AccountStatus),
    enumName: 'AccountStatus',
  })
  status: AccountStatus;

  @ApiMoneyProperty({
    description: 'Anlık bakiye; tarih aralığından etkilenmez',
    example: '749.50',
  })
  balance: string;
}

class IncomingDto {
  @ApiMoneyProperty({ example: '1050.00' })
  total: string;

  @ApiProperty({ type: AmountAndCountDto })
  deposits: AmountAndCountDto;

  @ApiProperty({
    type: AmountAndCountDto,
    description: 'Bu hesaba gelen transferler',
  })
  transfers: AmountAndCountDto;
}

class OutgoingDto {
  @ApiMoneyProperty({ example: '300.50' })
  total: string;

  @ApiProperty({ type: AmountAndCountDto })
  withdrawals: AmountAndCountDto;

  @ApiProperty({
    type: AmountAndCountDto,
    description: 'Bu hesaptan giden transferler',
  })
  transfers: AmountAndCountDto;
}

export class AccountReportDto implements AccountReport {
  @ApiProperty({ type: ReportAccountDto })
  account: ReportAccountDto;

  @ApiProperty({ type: ReportPeriodDto })
  period: ReportPeriodDto;

  @ApiProperty({ type: IncomingDto })
  incoming: IncomingDto;

  @ApiProperty({ type: OutgoingDto })
  outgoing: OutgoingDto;

  @ApiMoneyProperty({
    description: 'Gelen - giden (negatif olabilir)',
    example: '749.50',
  })
  netFlow: string;
}

// ---- Transaction stats ----

export class StatusCountsDto implements StatusCounts {
  @ApiProperty({ example: 120 })
  total: number;

  @ApiProperty({ example: 110 })
  success: number;

  @ApiProperty({ example: 9 })
  failed: number;

  @ApiProperty({ example: 1 })
  pending: number;
}

export class TypeStatsDto extends StatusCountsDto implements TypeStats {
  @ApiMoneyProperty({
    description: 'Başarılı işlemlerin toplam tutarı',
    example: '45000.00',
  })
  successAmount: string;

  @ApiMoneyProperty({
    description: 'Başarılı işlemlerin ortalama tutarı',
    example: '409.09',
  })
  averageSuccessAmount: string;
}

class StatsByTypeDto {
  @ApiProperty({ type: TypeStatsDto })
  DEPOSIT: TypeStatsDto;

  @ApiProperty({ type: TypeStatsDto })
  WITHDRAWAL: TypeStatsDto;

  @ApiProperty({ type: TypeStatsDto })
  TRANSFER: TypeStatsDto;
}

export class TransactionStatsReportDto implements TransactionStatsReport {
  @ApiProperty({ type: ReportPeriodDto })
  period: ReportPeriodDto;

  @ApiProperty({
    type: StatusCountsDto,
    description: 'Tüm türler için durum bazlı sayılar',
  })
  byStatus: StatusCountsDto;

  @ApiProperty({ type: StatsByTypeDto })
  byType: StatsByTypeDto;
}
