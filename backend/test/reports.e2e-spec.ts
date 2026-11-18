import { randomBytes, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { authorizedAgent, createTestApp, TestAgent } from './e2e-helpers';
import { todayInReportTimeZone } from '../src/reports/report-period';
import {
  AccountReport,
  SummaryReport,
  TransactionStatsReport,
  VolumeReport,
} from '../src/reports/reports.types';

// supertest yanıt gövdesini `any` olarak döndürür; testlerde tipli okumak için.
const bodyOf = <T>(res: request.Response): T => res.body as T;

/** İki para string'i arasındaki fark (Decimal ile, hassasiyet kaybı olmadan). */
const diff = (after: string, before: string) =>
  new Prisma.Decimal(after).minus(before).toFixed(2);

jest.setTimeout(30_000);

/**
 * Reports API entegrasyon testleri. Genel raporlar tüm veritabanını okuduğu
 * için testler mutlak değerler yerine "önce / sonra" farklarını doğrular.
 * (e2e suite'leri sıralı çalışır: test/jest-e2e.json -> maxWorkers: 1)
 */
describe('Reports API (e2e)', () => {
  let app: INestApplication<App>;
  let api: TestAgent;
  let prisma: PrismaService;
  const customerIds: string[] = [];
  const accountIds: string[] = [];
  const tag = randomBytes(6).toString('hex');
  const today = todayInReportTimeZone();
  const todayOnly = { startDate: today, endDate: today };

  const http = () => api;
  const get = async <T>(path: string, query: object = {}): Promise<T> =>
    bodyOf<T>(await http().get(path).query(query).expect(200));

  const createCustomer = async (): Promise<string> => {
    const { id } = await prisma.customer.create({
      data: {
        firstName: 'Rapor',
        lastName: 'Test',
        email: `reports-${customerIds.length}.${tag}@example.com`,
      },
    });
    customerIds.push(id);
    return id;
  };

  const openAccount = async (customerId: string): Promise<string> => {
    const res = await http().post('/accounts').send({ customerId }).expect(201);
    const { id } = bodyOf<{ id: string }>(res);
    accountIds.push(id);
    return id;
  };

  const post = (path: string, body: object, status: number) =>
    http().post(`/transactions/${path}`).send(body).expect(status);

  /** Geçmiş tarihli başarılı işlemi doğrudan veritabanına yazar (yalnızca test kurulumu). */
  const insertHistorical = (
    targetAccountId: string,
    amount: string,
    createdAt: string,
  ) =>
    prisma.transaction.create({
      data: {
        transactionNumber: `TEST-${randomUUID()}`,
        type: TransactionType.DEPOSIT,
        status: 'SUCCESS',
        targetAccountId,
        amount,
        createdAt: new Date(createdAt),
      },
    });

  beforeAll(async () => {
    app = await createTestApp();
    api = await authorizedAgent(app);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.transaction.deleteMany({
      where: {
        OR: [
          { sourceAccountId: { in: accountIds } },
          { targetAccountId: { in: accountIds } },
        ],
      },
    });
    await prisma.account.deleteMany({ where: { id: { in: accountIds } } });
    await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
    await app.close();
  });

  describe('özet, istatistik ve hacim (önce / sonra farkı)', () => {
    let summaryBefore: SummaryReport;
    let statsBefore: TransactionStatsReport;
    let volumeBefore: VolumeReport;
    let summaryAfter: SummaryReport;
    let statsAfter: TransactionStatsReport;
    let volumeAfter: VolumeReport;

    beforeAll(async () => {
      summaryBefore = await get('/reports/summary', todayOnly);
      statsBefore = await get('/reports/transaction-stats', todayOnly);
      volumeBefore = await get('/reports/volume', todayOnly);

      const customer = await createCustomer();
      const a = await openAccount(customer);
      const b = await openAccount(customer);

      await post('deposit', { accountId: a, amount: '1000.10' }, 201);
      await post('deposit', { accountId: b, amount: '0.20' }, 201);
      await post('withdraw', { accountId: a, amount: '300.05' }, 201);
      await post(
        'transfer',
        { sourceAccountId: a, targetAccountId: b, amount: '200' },
        201,
      );
      // Başarısız işlem: sayılara girer, tutarlara girmez.
      await post('withdraw', { accountId: b, amount: '99999' }, 422);
      // Bekleyen işlem: sayılara girer, tutarlara girmez.
      await prisma.transaction.create({
        data: {
          transactionNumber: `TEST-${randomUUID()}`,
          type: TransactionType.DEPOSIT,
          targetAccountId: a,
          amount: '5000',
        },
      });

      summaryAfter = await get('/reports/summary', todayOnly);
      statsAfter = await get('/reports/transaction-stats', todayOnly);
      volumeAfter = await get('/reports/volume', todayOnly);
    });

    it('summary: müşteri, hesap ve bakiye değişimini yansıtır', () => {
      expect(summaryAfter.customers.total - summaryBefore.customers.total).toBe(
        1,
      );
      expect(summaryAfter.accounts.total - summaryBefore.accounts.total).toBe(
        2,
      );
      expect(summaryAfter.accounts.active - summaryBefore.accounts.active).toBe(
        2,
      );
      // 1000.10 + 0.20 - 300.05 (transfer bakiyeyi değiştirmez toplamda)
      expect(
        diff(
          summaryAfter.accounts.totalBalance,
          summaryBefore.accounts.totalBalance,
        ),
      ).toBe('700.25');
    });

    it('summary: yalnızca SUCCESS işlemleri sayar, transferi giriş/çıkışa katmaz', () => {
      const after = summaryAfter.moneyFlow;
      const before = summaryBefore.moneyFlow;

      expect(diff(after.totalInflow, before.totalInflow)).toBe('1000.30');
      expect(diff(after.totalOutflow, before.totalOutflow)).toBe('300.05');
      expect(diff(after.netFlow, before.netFlow)).toBe('700.25');
      expect(diff(after.transfers.amount, before.transfers.amount)).toBe(
        '200.00',
      );
      expect(after.transfers.count - before.transfers.count).toBe(1);
    });

    it('transaction-stats: durum ve tür bazında sayar', () => {
      const delta = (key: 'total' | 'success' | 'failed' | 'pending') =>
        statsAfter.byStatus[key] - statsBefore.byStatus[key];
      expect([
        delta('total'),
        delta('success'),
        delta('failed'),
        delta('pending'),
      ]).toEqual([6, 4, 1, 1]);

      const deposits = (r: TransactionStatsReport) => r.byType.DEPOSIT;
      expect(deposits(statsAfter).total - deposits(statsBefore).total).toBe(3);
      expect(deposits(statsAfter).pending - deposits(statsBefore).pending).toBe(
        1,
      );
      expect(
        diff(
          deposits(statsAfter).successAmount,
          deposits(statsBefore).successAmount,
        ),
      ).toBe('1000.30');

      const withdrawals = (r: TransactionStatsReport) => r.byType.WITHDRAWAL;
      expect(
        withdrawals(statsAfter).failed - withdrawals(statsBefore).failed,
      ).toBe(1);
      expect(
        diff(
          withdrawals(statsAfter).successAmount,
          withdrawals(statsBefore).successAmount,
        ),
      ).toBe('300.05');
    });

    it('volume: bugünün periyoduna başarılı işlemleri ekler', () => {
      expect(volumeAfter.data).toHaveLength(1);
      const [after] = volumeAfter.data;
      const [before] = volumeBefore.data;

      expect(after.periodStart).toBe(today);
      expect(after.transactionCount - before.transactionCount).toBe(4);
      expect(diff(after.depositAmount, before.depositAmount)).toBe('1000.30');
      expect(diff(after.withdrawalAmount, before.withdrawalAmount)).toBe(
        '300.05',
      );
      expect(diff(after.transferAmount, before.transferAmount)).toBe('200.00');
    });
  });

  describe('Europe/Istanbul saat dilimi', () => {
    let account: string;

    beforeAll(async () => {
      account = await openAccount(await createCustomer());
      // UTC'de 31 Ocak 21:30, İstanbul'da 1 Şubat 00:30.
      await insertHistorical(account, '10.00', '2020-01-31T21:30:00Z');
      // UTC'de ve İstanbul'da 31 Ocak.
      await insertHistorical(account, '5.00', '2020-01-31T12:00:00Z');
    });

    it('günlük gruplamada İstanbul gününü kullanır ve boş günleri sıfırla doldurur', async () => {
      const report = await get<VolumeReport>('/reports/volume', {
        interval: 'daily',
        startDate: '2020-01-30',
        endDate: '2020-02-02',
      });

      expect(report.data.map((p) => [p.periodStart, p.depositAmount])).toEqual([
        ['2020-01-30', '0.00'],
        ['2020-01-31', '5.00'],
        ['2020-02-01', '10.00'],
        ['2020-02-02', '0.00'],
      ]);
    });

    it('haftalık gruplama pazartesiden, aylık gruplama ayın ilk gününden başlar', async () => {
      const weekly = await get<VolumeReport>('/reports/volume', {
        interval: 'weekly',
        startDate: '2020-01-27',
        endDate: '2020-02-09',
      });
      expect(
        weekly.data.map((p) => [p.periodStart, p.transactionCount]),
      ).toEqual([
        ['2020-01-27', 2],
        ['2020-02-03', 0],
      ]);

      const monthly = await get<VolumeReport>('/reports/volume', {
        interval: 'monthly',
        startDate: '2020-01-01',
        endDate: '2020-02-29',
      });
      expect(monthly.data.map((p) => [p.periodStart, p.depositAmount])).toEqual(
        [
          ['2020-01-01', '5.00'],
          ['2020-02-01', '10.00'],
        ],
      );
    });

    it('tarih filtresi İstanbul gün sınırlarını kullanır', async () => {
      const january = await get<AccountReport>(`/reports/accounts/${account}`, {
        startDate: '2020-01-31',
        endDate: '2020-01-31',
      });
      expect(january.incoming.deposits).toEqual({ amount: '5.00', count: 1 });

      const february = await get<AccountReport>(
        `/reports/accounts/${account}`,
        { startDate: '2020-02-01', endDate: '2020-02-01' },
      );
      expect(february.incoming.deposits).toEqual({ amount: '10.00', count: 1 });
    });
  });

  describe('GET /reports/accounts/:id', () => {
    it('transferleri gelen ve giden hareket olarak ayırır', async () => {
      const customer = await createCustomer();
      const a = await openAccount(customer);
      const b = await openAccount(customer);
      await post('deposit', { accountId: a, amount: '1000' }, 201);
      await post('deposit', { accountId: b, amount: '100' }, 201);
      await post('withdraw', { accountId: a, amount: '200.50' }, 201);
      await post(
        'transfer',
        { sourceAccountId: a, targetAccountId: b, amount: '100' },
        201,
      );
      await post(
        'transfer',
        { sourceAccountId: b, targetAccountId: a, amount: '50' },
        201,
      );
      await post('withdraw', { accountId: a, amount: '99999' }, 422);

      const report = await get<AccountReport>(`/reports/accounts/${a}`);

      expect(report).toMatchObject({
        account: { id: a, status: 'ACTIVE', balance: '749.50' },
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
    });

    it('işlemi olmayan hesap için sıfır değerler döndürür', async () => {
      const id = await openAccount(await createCustomer());

      const report = await get<AccountReport>(`/reports/accounts/${id}`);

      expect(report).toMatchObject({
        account: { balance: '0.00' },
        incoming: {
          total: '0.00',
          deposits: { amount: '0.00', count: 0 },
          transfers: { amount: '0.00', count: 0 },
        },
        outgoing: { total: '0.00' },
        netFlow: '0.00',
      });
    });

    it('bulunamayan hesapta 404, geçersiz UUID için 400 döner', async () => {
      await http().get(`/reports/accounts/${randomUUID()}`).expect(404);
      await http().get('/reports/accounts/abc').expect(400);
    });
  });

  describe('boş dönem ve doğrulama', () => {
    const emptyPeriod = { startDate: '2000-01-01', endDate: '2000-01-03' };

    it('veri olmayan dönemde sıfır değerler döner', async () => {
      const summary = await get<SummaryReport>('/reports/summary', emptyPeriod);
      expect(summary.moneyFlow).toEqual({
        totalInflow: '0.00',
        totalOutflow: '0.00',
        netFlow: '0.00',
        transfers: { amount: '0.00', count: 0 },
      });

      const stats = await get<TransactionStatsReport>(
        '/reports/transaction-stats',
        emptyPeriod,
      );
      expect(stats.byStatus).toEqual({
        total: 0,
        success: 0,
        failed: 0,
        pending: 0,
      });
      expect(stats.byType.TRANSFER.averageSuccessAmount).toBe('0.00');

      const volume = await get<VolumeReport>('/reports/volume', emptyPeriod);
      expect(volume.data).toHaveLength(3);
      expect(volume.data.every((p) => p.transactionCount === 0)).toBe(true);
    });

    it('volume varsayılan olarak son 30 günü döndürür', async () => {
      const volume = await get<VolumeReport>('/reports/volume');
      expect(volume.interval).toBe('daily');
      expect(volume.data).toHaveLength(30);
      expect(volume.period.endDate).toBe(today);
    });

    it.each([
      ['/reports/summary', { startDate: '2026-12-01', endDate: '2026-11-01' }],
      ['/reports/summary', { startDate: '01.11.2026' }],
      ['/reports/transaction-stats', { endDate: '2026-02-30' }],
      ['/reports/volume', { interval: 'yearly' }],
      ['/reports/volume', { startDate: '2000-01-01', endDate: '2026-01-01' }],
      ['/reports/summary', { unknown: 'x' }],
    ])('%s geçersiz sorguda 400 döner (%o)', async (path, query) => {
      await http().get(path).query(query).expect(400);
    });
  });
});
