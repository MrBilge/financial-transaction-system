import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto';
import { VolumeQueryDto } from './dto/volume-query.dto';
import { ReportsService } from './reports.service';

const ACCOUNT_ID = '7b1e4c2a-9d3f-4e5a-8b6c-1d2e3f4a5b6c';
const d = (value: string) => new Prisma.Decimal(value);

describe('ReportsService', () => {
  let service: ReportsService;
  const prisma = {
    customer: { count: jest.fn() },
    account: { findUnique: jest.fn() },
    $queryRaw: jest.fn(),
    $transaction: jest.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };

  /** n. ham sorgunun SQL metni ve parametreleri. */
  const rawQuery = (n = 0) => {
    const [strings, ...values] = prisma.$queryRaw.mock.calls[n] as [
      TemplateStringsArray,
      ...unknown[],
    ];
    return Prisma.sql(strings, ...values);
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ReportsService);
  });

  const period = (overrides: Partial<ReportPeriodQueryDto> = {}) =>
    Object.assign(new ReportPeriodQueryDto(), overrides);

  describe('getSummary', () => {
    it('anlık sayıları ve başarılı para akışını tek snapshot içinde döndürür', async () => {
      prisma.customer.count.mockResolvedValue(3);
      prisma.$queryRaw
        .mockResolvedValueOnce([
          { total: 5, active: 4, passive: 1, total_balance: d('1500.5') },
        ])
        .mockResolvedValueOnce([
          {
            total_inflow: d('2000'),
            total_outflow: d('499.5'),
            net_flow: d('1500.5'),
            transfer_amount: d('9999999999999999.99'),
            transfer_count: 2,
          },
        ]);

      const result = await service.getSummary(
        period({ startDate: '2026-11-01', endDate: '2026-11-30' }),
      );

      expect(result).toEqual({
        period: {
          startDate: '2026-11-01',
          endDate: '2026-11-30',
          timeZone: 'Europe/Istanbul',
        },
        customers: { total: 3 },
        accounts: { total: 5, active: 4, passive: 1, totalBalance: '1500.50' },
        moneyFlow: {
          totalInflow: '2000.00',
          totalOutflow: '499.50',
          netFlow: '1500.50',
          transfers: { amount: '9999999999999999.99', count: 2 },
        },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Array), {
        isolationLevel: 'RepeatableRead',
      });

      const flowQuery = rawQuery(1);
      expect(flowQuery.sql).toContain(`status = 'SUCCESS'`);
      expect(flowQuery.sql).toContain('AT TIME ZONE');
      expect(flowQuery.values).toEqual(
        expect.arrayContaining(['2026-11-01', '2026-11-30', 'Europe/Istanbul']),
      );
    });

    it('tarih verilmezse tarih koşulu eklemez', async () => {
      prisma.customer.count.mockResolvedValue(0);
      prisma.$queryRaw
        .mockResolvedValueOnce([
          { total: 0, active: 0, passive: 0, total_balance: d('0') },
        ])
        .mockResolvedValueOnce([
          {
            total_inflow: d('0'),
            total_outflow: d('0'),
            net_flow: d('0'),
            transfer_amount: d('0'),
            transfer_count: 0,
          },
        ]);

      const result = await service.getSummary(period());

      expect(rawQuery(1).sql).not.toContain('created_at');
      expect(result.moneyFlow.totalInflow).toBe('0.00');
      expect(result.period).toEqual({
        startDate: null,
        endDate: null,
        timeZone: 'Europe/Istanbul',
      });
    });

    it('başlangıç bitişten sonraysa 400 döner', async () => {
      await expect(
        service.getSummary(
          period({ startDate: '2026-12-01', endDate: '2026-11-01' }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('getVolume', () => {
    it('periyotları veritabanında gruplar ve tutarları string döndürür', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          period_start: '2026-11-01',
          transaction_count: 2,
          deposit_amount: d('100.1'),
          withdrawal_amount: d('0'),
          transfer_amount: d('50'),
        },
      ]);
      const query = Object.assign(new VolumeQueryDto(), {
        interval: 'monthly',
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      });

      const result = await service.getVolume(query);

      expect(result).toEqual({
        interval: 'monthly',
        period: {
          startDate: '2026-11-01',
          endDate: '2026-11-30',
          timeZone: 'Europe/Istanbul',
        },
        data: [
          {
            periodStart: '2026-11-01',
            transactionCount: 2,
            depositAmount: '100.10',
            withdrawalAmount: '0.00',
            transferAmount: '50.00',
          },
        ],
      });
      const sql = rawQuery();
      expect(sql.sql).toContain('generate_series');
      expect(sql.sql).toContain('LEFT JOIN');
      expect(sql.values).toEqual(
        expect.arrayContaining(['month', '1 month', 'Europe/Istanbul']),
      );
    });
  });

  describe('getAccountReport', () => {
    const flowRow = {
      deposit_amount: d('1000'),
      deposit_count: 1,
      transfer_in_amount: d('50'),
      transfer_in_count: 1,
      withdrawal_amount: d('200.5'),
      withdrawal_count: 1,
      transfer_out_amount: d('100'),
      transfer_out_count: 1,
      total_incoming: d('1050'),
      total_outgoing: d('300.5'),
      net_flow: d('749.5'),
    };

    it('gelen ve giden hareketleri ayrıştırarak döndürür', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: ACCOUNT_ID,
        accountNumber: '1234567890123456',
        customerId: 'c',
        status: 'ACTIVE',
        balance: d('749.5'),
      });
      prisma.$queryRaw.mockResolvedValue([flowRow]);

      const result = await service.getAccountReport(ACCOUNT_ID, period());

      expect(result).toMatchObject({
        account: { id: ACCOUNT_ID, balance: '749.50' },
        incoming: {
          total: '1050.00',
          deposits: { amount: '1000.00', count: 1 },
          transfers: { amount: '50.00', count: 1 },
        },
        outgoing: {
          total: '300.50',
          withdrawals: { amount: '200.50', count: 1 },
          transfers: { amount: '100.00', count: 1 },
        },
        netFlow: '749.50',
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Array), {
        isolationLevel: 'RepeatableRead',
      });
      expect(rawQuery().values).toContain(ACCOUNT_ID);
    });

    it('hesap yoksa 404 döner', async () => {
      prisma.account.findUnique.mockResolvedValue(null);
      prisma.$queryRaw.mockResolvedValue([flowRow]);

      await expect(
        service.getAccountReport(ACCOUNT_ID, period()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getTransactionStats', () => {
    const row = (type: string | null, counts: number[], amount: string) => ({
      type,
      total_count: counts[0],
      success_count: counts[1],
      failed_count: counts[2],
      pending_count: counts[3],
      success_amount: d(amount),
      average_success_amount: d(amount),
    });

    it('ROLLUP sonuçlarını durum ve tür bazında eşler, eksik türleri sıfırlar', async () => {
      prisma.$queryRaw.mockResolvedValue([
        row('DEPOSIT', [3, 2, 1, 0], '150'),
        row(null, [3, 2, 1, 0], '150'),
      ]);

      const result = await service.getTransactionStats(period());

      expect(result.byStatus).toEqual({
        total: 3,
        success: 2,
        failed: 1,
        pending: 0,
      });
      expect(result.byType.DEPOSIT).toEqual({
        total: 3,
        success: 2,
        failed: 1,
        pending: 0,
        successAmount: '150.00',
        averageSuccessAmount: '150.00',
      });
      expect(result.byType.TRANSFER).toEqual({
        total: 0,
        success: 0,
        failed: 0,
        pending: 0,
        successAmount: '0.00',
        averageSuccessAmount: '0.00',
      });
      expect(rawQuery().sql).toContain('GROUP BY ROLLUP (type)');
    });

    it('hiç veri yoksa tüm değerler sıfırdır', async () => {
      prisma.$queryRaw.mockResolvedValue([]);

      const result = await service.getTransactionStats(period());

      expect(result.byStatus).toEqual({
        total: 0,
        success: 0,
        failed: 0,
        pending: 0,
      });
      expect(result.byType.WITHDRAWAL.successAmount).toBe('0.00');
    });
  });
});
