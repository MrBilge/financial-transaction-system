import { randomBytes, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { authorizedAgent, createTestApp, TestAgent } from './e2e-helpers';

interface TransactionBody {
  id: string;
  transactionNumber: string;
  sourceAccountId: string | null;
  targetAccountId: string | null;
  sourceAccountNumber: string | null;
  targetAccountNumber: string | null;
  amount: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  failureReason: string | null;
}

interface TransactionListBody {
  data: TransactionBody[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface RejectedBody {
  statusCode: number;
  message: string;
  transaction: TransactionBody;
}

// supertest yanıt gövdesini `any` olarak döndürür; testlerde tipli okumak için.
const bodyOf = <T>(res: request.Response): T => res.body as T;

jest.setTimeout(30_000);

/**
 * Transactions API entegrasyon testleri. Gerçek PostgreSQL üzerinde çalışır;
 * eş zamanlılık senaryoları gerçek satır kilitlerini (SELECT FOR UPDATE) test eder.
 */
describe('Transactions API (e2e)', () => {
  let app: INestApplication<App>;
  let api: TestAgent;
  let prisma: PrismaService;
  let customerId: string;
  const accountIds: string[] = [];
  const tag = randomBytes(6).toString('hex');

  const http = () => api;

  const openAccount = async (): Promise<string> => {
    const res = await http().post('/accounts').send({ customerId }).expect(201);
    const { id } = bodyOf<{ id: string }>(res);
    accountIds.push(id);
    return id;
  };

  const deposit = (accountId: string, amount: string) =>
    http().post('/transactions/deposit').send({ accountId, amount });
  const withdraw = (accountId: string, amount: string) =>
    http().post('/transactions/withdraw').send({ accountId, amount });
  const transfer = (
    sourceAccountId: string,
    targetAccountId: string,
    amount: string,
  ) =>
    http()
      .post('/transactions/transfer')
      .send({ sourceAccountId, targetAccountId, amount });

  const openFundedAccount = async (amount: string): Promise<string> => {
    const id = await openAccount();
    await deposit(id, amount).expect(201);
    return id;
  };

  const balanceOf = async (id: string): Promise<string> =>
    (await prisma.account.findUniqueOrThrow({ where: { id } })).balance.toFixed(
      2,
    );

  const transactionsOf = (id: string) =>
    prisma.transaction.findMany({
      where: { OR: [{ sourceAccountId: id }, { targetAccountId: id }] },
    });

  beforeAll(async () => {
    app = await createTestApp();
    api = await authorizedAgent(app);
    prisma = app.get(PrismaService);

    const customer = await prisma.customer.create({
      data: {
        firstName: 'İşlem',
        lastName: 'Test',
        email: `transactions.${tag}@example.com`,
      },
    });
    customerId = customer.id;
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
    await prisma.customer.delete({ where: { id: customerId } });
    await app.close();
  });

  describe('başarılı işlemler', () => {
    it('para yatırır (201)', async () => {
      const id = await openAccount();

      const res = await deposit(id, '1000.50').expect(201);

      expect(bodyOf<TransactionBody>(res)).toMatchObject({
        type: 'DEPOSIT',
        status: 'SUCCESS',
        amount: '1000.50',
        sourceAccountId: null,
        targetAccountId: id,
        failureReason: null,
      });
      expect(bodyOf<TransactionBody>(res).transactionNumber).toMatch(
        /^TRX-\d{8}-[0-9A-F]{12}$/,
      );
      expect(await balanceOf(id)).toBe('1000.50');
    });

    it('para çeker (201)', async () => {
      const id = await openFundedAccount('1000');

      const res = await withdraw(id, '250.25').expect(201);

      expect(bodyOf<TransactionBody>(res)).toMatchObject({
        type: 'WITHDRAWAL',
        status: 'SUCCESS',
        sourceAccountId: id,
        targetAccountId: null,
      });
      expect(await balanceOf(id)).toBe('749.75');
    });

    it('tüm bakiyeyi çekebilir', async () => {
      const id = await openFundedAccount('10.01');
      await withdraw(id, '10.01').expect(201);
      expect(await balanceOf(id)).toBe('0.00');
    });

    it('hesaplar arası transfer yapar (201)', async () => {
      const source = await openFundedAccount('500');
      const target = await openFundedAccount('100');

      const res = await transfer(source, target, '125.50').expect(201);

      const [sourceAccount, targetAccount] = await Promise.all([
        prisma.account.findUniqueOrThrow({ where: { id: source } }),
        prisma.account.findUniqueOrThrow({ where: { id: target } }),
      ]);
      expect(bodyOf<TransactionBody>(res)).toMatchObject({
        type: 'TRANSFER',
        status: 'SUCCESS',
        sourceAccountId: source,
        targetAccountId: target,
        sourceAccountNumber: sourceAccount.accountNumber,
        targetAccountNumber: targetAccount.accountNumber,
      });
      expect(await balanceOf(source)).toBe('374.50');
      expect(await balanceOf(target)).toBe('225.50');
    });
  });

  describe('iş kuralı ihlalleri', () => {
    it('yetersiz bakiyede 422 döner, bakiye değişmez ve FAILED kayıt korunur', async () => {
      const id = await openFundedAccount('100');

      const res = await withdraw(id, '100.01').expect(422);

      const body = bodyOf<RejectedBody>(res);
      expect(body.message).toBe('Yetersiz bakiye');
      expect(body.transaction).toMatchObject({
        status: 'FAILED',
        failureReason: 'Yetersiz bakiye',
        amount: '100.01',
      });
      expect(await balanceOf(id)).toBe('100.00');

      const stored = await prisma.transaction.findUniqueOrThrow({
        where: { id: body.transaction.id },
      });
      expect(stored.status).toBe('FAILED');
      expect(stored.failureReason).toBe('Yetersiz bakiye');
    });

    it('yetersiz bakiyeli transferde iki hesap da değişmez', async () => {
      const source = await openFundedAccount('50');
      const target = await openFundedAccount('50');

      await transfer(source, target, '50.01').expect(422);

      expect(await balanceOf(source)).toBe('50.00');
      expect(await balanceOf(target)).toBe('50.00');
    });

    it('pasif hesaba para yatırılamaz, pasif hesaptan çekilemez ve transfer yapılamaz', async () => {
      const passive = await openFundedAccount('100');
      const active = await openFundedAccount('100');
      await http()
        .patch(`/accounts/${passive}/status`)
        .send({ status: 'PASSIVE' })
        .expect(200);

      const cases: [request.Test, string][] = [
        [deposit(passive, '1'), 'Hedef hesap aktif değil'],
        [withdraw(passive, '1'), 'Kaynak hesap aktif değil'],
        [transfer(passive, active, '1'), 'Kaynak hesap aktif değil'],
        [transfer(active, passive, '1'), 'Hedef hesap aktif değil'],
      ];
      for (const [call, reason] of cases) {
        const res = await call.expect(422);
        expect(bodyOf<RejectedBody>(res).transaction).toMatchObject({
          status: 'FAILED',
          failureReason: reason,
        });
      }

      expect(await balanceOf(passive)).toBe('100.00');
      expect(await balanceOf(active)).toBe('100.00');
    });

    it.each([
      ['sıfır', '0'],
      ['negatif', '-5'],
      ['3 ondalık basamak', '1.005'],
      ['number tipi', 10],
      ['metin', 'on lira'],
      ['eksik', undefined],
    ])(
      'geçersiz tutar (%s) için 400 döner ve kayıt oluşmaz',
      async (_l, amount) => {
        const id = await openFundedAccount('100');

        await deposit(id, amount as string).expect(400);
        await withdraw(id, amount as string).expect(400);

        expect(await transactionsOf(id)).toHaveLength(1); // yalnızca fonlama
        expect(await balanceOf(id)).toBe('100.00');
      },
    );

    it('aynı hesaba transferde (büyük/küçük harf farkı olsa da) 400 döner', async () => {
      const id = await openFundedAccount('100');

      const res = await transfer(id, id.toUpperCase(), '1').expect(400);

      expect(bodyOf<{ message: string }>(res).message).toBe(
        'Aynı hesaba transfer yapılamaz',
      );
      expect(await transactionsOf(id)).toHaveLength(1);
    });

    it('bulunamayan hesap için 404 döner ve kayıt oluşmaz', async () => {
      const id = await openFundedAccount('100');
      const missing = randomUUID();

      await deposit(missing, '1').expect(404);
      await transfer(id, missing, '1').expect(404);

      expect(await transactionsOf(id)).toHaveLength(1);
      expect(await balanceOf(id)).toBe('100.00');
    });

    it('geçersiz UUID için 400 döner', async () => {
      await deposit('abc', '1').expect(400);
    });
  });

  describe('decimal hassasiyeti', () => {
    it('0.10 + 0.20 tam olarak 0.30 olur', async () => {
      const id = await openAccount();
      await deposit(id, '0.10').expect(201);
      await deposit(id, '0.20').expect(201);

      expect(await balanceOf(id)).toBe('0.30');

      await withdraw(id, '0.30').expect(201);
      expect(await balanceOf(id)).toBe('0.00');
    });

    it('Decimal(18,2) sınırındaki tutarı kayıpsız işler', async () => {
      const id = await openAccount();

      const res = await deposit(id, '9999999999999999.99').expect(201);

      expect(bodyOf<TransactionBody>(res).amount).toBe('9999999999999999.99');
      expect(await balanceOf(id)).toBe('9999999999999999.99');

      await withdraw(id, '0.01').expect(201);
      expect(await balanceOf(id)).toBe('9999999999999999.98');
    });
  });

  describe('rollback', () => {
    it('ikinci bakiye güncellemesi başarısız olursa ilki de geri alınır ve FAILED kayıt korunur', async () => {
      const source = await openFundedAccount('100');
      const target = await openAccount();
      // Hedef bakiye Decimal(18,2) üst sınırında: kaynaktan düşüldükten SONRA
      // hedefe eklemek veritabanında "numeric field overflow" hatası verir.
      await prisma.account.update({
        where: { id: target },
        data: { balance: '9999999999999999.99' },
      });

      await transfer(source, target, '1').expect(500);

      expect(await balanceOf(source)).toBe('100.00');
      expect(await balanceOf(target)).toBe('9999999999999999.99');
      const [failed] = await prisma.transaction.findMany({
        where: { sourceAccountId: source, type: 'TRANSFER' },
      });
      expect(failed).toMatchObject({
        status: 'FAILED',
        failureReason: 'İşlem beklenmeyen bir hata nedeniyle tamamlanamadı',
      });
    });
  });

  describe('eş zamanlılık', () => {
    const statuses = (responses: request.Response[]) =>
      responses.map((r) => r.status).sort();

    it('1000 TL bakiyeden eş zamanlı iki 800 TL çekimde yalnızca biri başarılı olur', async () => {
      const id = await openFundedAccount('1000');

      const responses = await Promise.all([
        withdraw(id, '800'),
        withdraw(id, '800'),
      ]);

      expect(statuses(responses)).toEqual([201, 422]);
      expect(await balanceOf(id)).toBe('200.00');
      const withdrawals = await prisma.transaction.findMany({
        where: { sourceAccountId: id, type: 'WITHDRAWAL' },
      });
      expect(withdrawals.map((t) => t.status).sort()).toEqual([
        'FAILED',
        'SUCCESS',
      ]);
    });

    it('10 eş zamanlı çekimde bakiye asla negatife düşmez', async () => {
      const id = await openFundedAccount('1000');

      const responses = await Promise.all(
        Array.from({ length: 10 }, () => withdraw(id, '150')),
      );

      const succeeded = responses.filter((r) => r.status === 201).length;
      expect(succeeded).toBe(6); // 6 x 150 = 900
      expect(responses.filter((r) => r.status === 422)).toHaveLength(4);
      expect(await balanceOf(id)).toBe('100.00');
    });

    it('eş zamanlı çekim ve transferde yalnızca biri başarılı olur', async () => {
      const source = await openFundedAccount('1000');
      const target = await openAccount();

      const responses = await Promise.all([
        withdraw(source, '700'),
        transfer(source, target, '700'),
      ]);

      expect(statuses(responses)).toEqual([201, 422]);
      const sourceBalance = await balanceOf(source);
      const targetBalance = await balanceOf(target);
      expect(sourceBalance).toBe('300.00');
      // Transfer kazandıysa hedef 700, çekim kazandıysa 0 olmalı.
      expect(['0.00', '700.00']).toContain(targetBalance);
    });

    it('ters yönlü eş zamanlı transferler deadlock olmadan tamamlanır', async () => {
      const a = await openFundedAccount('1000');
      const b = await openFundedAccount('1000');

      const responses = await Promise.all(
        Array.from({ length: 10 }, () => [
          transfer(a, b, '10'),
          transfer(b, a, '10'),
        ]).flat(),
      );

      expect(responses.every((r) => r.status === 201)).toBe(true);
      expect(await balanceOf(a)).toBe('1000.00');
      expect(await balanceOf(b)).toBe('1000.00');
    });

    it('eş zamanlı durum güncellemesi kilidi bırakana kadar çekim bekler ve güncel durumu görür', async () => {
      const id = await openFundedAccount('100');

      // Hesap durumunu PASSIVE yapan ve satır kilidini bir süre tutan transaction.
      let markLocked!: () => void;
      const locked = new Promise<void>((resolve) => (markLocked = resolve));
      const statusUpdate = prisma.$transaction(async (tx) => {
        await tx.account.update({
          where: { id },
          data: { status: 'PASSIVE' },
        });
        markLocked();
        await new Promise((resolve) => setTimeout(resolve, 500));
      });

      await locked;
      const startedAt = Date.now();
      const res = await withdraw(id, '10');
      await statusUpdate;

      // Çekim, kilit bırakılana kadar beklemeli ve commit edilen PASSIVE durumu görmeli.
      expect(Date.now() - startedAt).toBeGreaterThanOrEqual(300);
      expect(res.status).toBe(422);
      expect(bodyOf<RejectedBody>(res).message).toBe(
        'Kaynak hesap aktif değil',
      );
      expect(await balanceOf(id)).toBe('100.00');
    });
  });

  describe('listeleme', () => {
    let account: string;
    let other: string;
    let depositNumber: string;

    beforeAll(async () => {
      account = await openAccount();
      other = await openAccount();
      const first = await deposit(account, '100').expect(201);
      depositNumber = bodyOf<TransactionBody>(first).transactionNumber;
      await deposit(account, '250.50').expect(201);
      await withdraw(account, '50').expect(201);
      await transfer(account, other, '30').expect(201);
      await withdraw(account, '99999').expect(422);
    });

    const list = (path: string, query: Record<string, unknown> = {}) =>
      http().get(path).query(query).expect(200);
    const listBody = async (path: string, query?: Record<string, unknown>) =>
      bodyOf<TransactionListBody>(await list(path, query));

    it('hesabın gelen ve giden tüm işlemlerini döndürür', async () => {
      expect(
        (await listBody(`/accounts/${account}/transactions`)).meta.total,
      ).toBe(5);

      const otherHistory = await listBody(`/accounts/${other}/transactions`);
      expect(otherHistory.data.map((t) => t.type)).toEqual(['TRANSFER']);

      const viaQuery = await listBody('/transactions', { accountId: account });
      expect(viaQuery.meta.total).toBe(5);
    });

    it('tür ve duruma göre filtreler', async () => {
      const path = `/accounts/${account}/transactions`;
      expect((await listBody(path, { type: 'DEPOSIT' })).meta.total).toBe(2);
      expect((await listBody(path, { type: 'TRANSFER' })).meta.total).toBe(1);

      const failed = await listBody(path, { status: 'FAILED' });
      expect(failed.data).toHaveLength(1);
      expect(failed.data[0]).toMatchObject({
        amount: '99999.00',
        failureReason: 'Yetersiz bakiye',
      });
    });

    it('tutar aralığına göre filtreler ve tutara göre sıralar', async () => {
      const body = await listBody(`/accounts/${account}/transactions`, {
        minAmount: '50',
        maxAmount: '250.50',
        sortBy: 'amount',
        sortOrder: 'asc',
      });

      expect(body.data.map((t) => t.amount)).toEqual([
        '50.00',
        '100.00',
        '250.50',
      ]);
    });

    it('tarih aralığına göre filtreler', async () => {
      const path = `/accounts/${account}/transactions`;
      const hourAgo = new Date(Date.now() - 3_600_000).toISOString();
      const inHour = new Date(Date.now() + 3_600_000).toISOString();

      expect(
        (await listBody(path, { startDate: hourAgo, endDate: inHour })).meta
          .total,
      ).toBe(5);
      expect((await listBody(path, { startDate: inHour })).meta.total).toBe(0);
      expect((await listBody(path, { endDate: hourAgo })).meta.total).toBe(0);
    });

    it('işlem numarasına göre büyük/küçük harf duyarsız arar', async () => {
      const body = await listBody('/transactions', {
        search: depositNumber.toLowerCase(),
      });

      expect(body.data.map((t) => t.transactionNumber)).toEqual([
        depositNumber,
      ]);
    });

    it('sayfalar ve en yeniyi önce döndürür', async () => {
      const body = await listBody(`/accounts/${account}/transactions`, {
        limit: 2,
        page: 1,
      });

      expect(body.meta).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });
      expect(body.data[0].status).toBe('FAILED'); // son işlem
    });

    it('geçersiz sorgularda 400, bulunamayan hesapta 404 döner', async () => {
      const path = `/accounts/${account}/transactions`;
      await http()
        .get(path)
        .query({ startDate: '2026-12-01', endDate: '2026-11-01' })
        .expect(400);
      await http()
        .get(path)
        .query({ minAmount: '10', maxAmount: '5' })
        .expect(400);
      await http().get(path).query({ accountId: other }).expect(400);
      await http().get(path).query({ type: 'REFUND' }).expect(400);
      await http().get('/accounts/abc/transactions').expect(400);
      await http().get(`/accounts/${randomUUID()}/transactions`).expect(404);
    });
  });

  describe('GET /transactions/:id ve değiştirilemezlik', () => {
    it('işlemi döndürür; 404 ve 400 durumlarını yönetir', async () => {
      const id = await openAccount();
      const created = bodyOf<TransactionBody>(
        await deposit(id, '10').expect(201),
      );

      const res = await http().get(`/transactions/${created.id}`).expect(200);
      expect(bodyOf<TransactionBody>(res)).toEqual(created);

      await http().get(`/transactions/${randomUUID()}`).expect(404);
      await http().get('/transactions/not-a-uuid').expect(400);
    });

    it("işlem güncelleme ve silme endpoint'i yoktur", async () => {
      const id = await openAccount();
      const created = bodyOf<TransactionBody>(
        await deposit(id, '10').expect(201),
      );

      await http()
        .patch(`/transactions/${created.id}`)
        .send({ amount: '1' })
        .expect(404);
      await http().delete(`/transactions/${created.id}`).expect(404);

      const stored = await prisma.transaction.findUniqueOrThrow({
        where: { id: created.id },
      });
      expect(stored.amount.toFixed(2)).toBe('10.00');
      expect(stored.status).toBe('SUCCESS');
    });
  });
});
