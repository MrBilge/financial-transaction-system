import { randomBytes, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { PrismaService } from '../src/prisma/prisma.service';
import { authorizedAgent, createTestApp, TestAgent } from './e2e-helpers';

interface AccountBody {
  id: string;
  customerId: string;
  accountNumber: string;
  balance: string;
  status: 'ACTIVE' | 'PASSIVE';
}

interface AccountListBody {
  data: AccountBody[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface ErrorBody {
  message: string | string[];
}

// supertest yanıt gövdesini `any` olarak döndürür; testlerde tipli okumak için.
const bodyOf = <T>(res: request.Response): T => res.body as T;

/**
 * Accounts API entegrasyon testleri. Gerçek PostgreSQL veritabanı kullanır;
 * oluşturduğu müşteri ve hesapları sonunda siler.
 */
describe('Accounts API (e2e)', () => {
  let app: INestApplication<App>;
  let api: TestAgent;
  let prisma: PrismaService;
  let customerId: string;
  let otherCustomerId: string;

  const tag = randomBytes(6).toString('hex');
  const http = () => api;

  const openAccount = async (forCustomer: string): Promise<AccountBody> =>
    bodyOf<AccountBody>(
      await http()
        .post('/accounts')
        .send({ customerId: forCustomer })
        .expect(201),
    );

  beforeAll(async () => {
    app = await createTestApp();
    api = await authorizedAgent(app);
    prisma = app.get(PrismaService);

    const [customer, other] = await Promise.all(
      ['bir', 'iki'].map((name) =>
        prisma.customer.create({
          data: {
            firstName: 'Hesap',
            lastName: 'Test',
            email: `accounts-${name}.${tag}@example.com`,
          },
        }),
      ),
    );
    customerId = customer.id;
    otherCustomerId = other.id;
  });

  afterAll(async () => {
    const customerIds = [customerId, otherCustomerId];
    await prisma.account.deleteMany({
      where: { customerId: { in: customerIds } },
    });
    await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
    await app.close();
  });

  describe('POST /accounts', () => {
    it('0 bakiyeli, ACTIVE ve otomatik numaralı hesap açar (201)', async () => {
      const account = await openAccount(customerId);

      expect(account).toMatchObject({
        customerId,
        balance: '0.00',
        status: 'ACTIVE',
      });
      expect(account.accountNumber).toMatch(/^[1-9]\d{15}$/);
    });

    it('aynı müşteriye benzersiz numaralarla birden fazla hesap açar', async () => {
      const first = await openAccount(customerId);
      const second = await openAccount(customerId);

      expect(first.accountNumber).not.toBe(second.accountNumber);
    });

    it('bulunamayan müşteri için 404 döndürür', async () => {
      const res = await http()
        .post('/accounts')
        .send({ customerId: randomUUID() })
        .expect(404);

      expect(bodyOf<ErrorBody>(res).message).toMatch(/^Müşteri bulunamadı/);
    });

    it('geçersiz customerId için 400 döndürür', async () => {
      await http().post('/accounts').send({ customerId: 'abc' }).expect(400);
    });

    it.each([
      ['balance', { balance: '1000' }],
      ['accountNumber', { accountNumber: '1111222233334444' }],
      ['status', { status: 'PASSIVE' }],
    ])('%s gönderilirse 400 döndürür', async (_field, extra) => {
      await http()
        .post('/accounts')
        .send({ customerId, ...extra })
        .expect(400);
    });
  });

  describe('GET /accounts/:id', () => {
    it('hesabı döndürür (200)', async () => {
      const account = await openAccount(customerId);

      const res = await http().get(`/accounts/${account.id}`).expect(200);
      expect(bodyOf<AccountBody>(res)).toEqual(account);
    });

    it('bulunamayan hesap için 404 döndürür', async () => {
      const res = await http().get(`/accounts/${randomUUID()}`).expect(404);
      expect(bodyOf<ErrorBody>(res).message).toMatch(/^Hesap bulunamadı/);
    });

    it('geçersiz UUID için 400 döndürür', async () => {
      await http().get('/accounts/not-a-uuid').expect(400);
    });
  });

  describe('PATCH /accounts/:id/status', () => {
    it('durumu günceller ve bakiyeye dokunmaz (200)', async () => {
      const account = await openAccount(customerId);

      const res = await http()
        .patch(`/accounts/${account.id}/status`)
        .send({ status: 'PASSIVE' })
        .expect(200);

      expect(bodyOf<AccountBody>(res)).toMatchObject({
        id: account.id,
        status: 'PASSIVE',
        balance: '0.00',
      });
    });

    it('bakiye gönderilirse 400 döndürür ve bakiye değişmez', async () => {
      const account = await openAccount(customerId);

      await http()
        .patch(`/accounts/${account.id}/status`)
        .send({ status: 'PASSIVE', balance: '5000' })
        .expect(400);

      const stored = await prisma.account.findUniqueOrThrow({
        where: { id: account.id },
      });
      expect(stored.balance.toFixed(2)).toBe('0.00');
      expect(stored.status).toBe('ACTIVE');
    });

    it('geçersiz durum için 400 döndürür', async () => {
      const account = await openAccount(customerId);
      await http()
        .patch(`/accounts/${account.id}/status`)
        .send({ status: 'CLOSED' })
        .expect(400);
    });

    it('bulunamayan hesap için 404 döndürür', async () => {
      await http()
        .patch(`/accounts/${randomUUID()}/status`)
        .send({ status: 'PASSIVE' })
        .expect(404);
    });

    it('geçersiz UUID için 400 döndürür', async () => {
      await http()
        .patch('/accounts/123/status')
        .send({ status: 'PASSIVE' })
        .expect(400);
    });
  });

  describe('listeleme', () => {
    let accounts: AccountBody[];

    beforeAll(async () => {
      // Bu blok yalnızca otherCustomerId hesaplarıyla çalışır.
      accounts = [];
      for (let i = 0; i < 3; i++) {
        accounts.push(await openAccount(otherCustomerId));
      }
      // Bakiye yalnızca test kurulumu için doğrudan veritabanından ayarlanır.
      await prisma.account.update({
        where: { id: accounts[0].id },
        data: { balance: '9999999999999999.99', status: 'PASSIVE' },
      });
      await prisma.account.update({
        where: { id: accounts[1].id },
        data: { balance: '150.50' },
      });
    });

    it('GET /accounts müşteri ve duruma göre filtreler', async () => {
      const res = await http()
        .get('/accounts')
        .query({ customerId: otherCustomerId, status: 'ACTIVE' })
        .expect(200);

      const body = bodyOf<AccountListBody>(res);
      expect(body.meta.total).toBe(2);
      expect(body.data.every((a) => a.status === 'ACTIVE')).toBe(true);
    });

    it('GET /accounts hesap numarasına göre arar', async () => {
      const target = accounts[2];
      const res = await http()
        .get('/accounts')
        .query({ search: target.accountNumber.slice(2, 14) })
        .expect(200);

      expect(bodyOf<AccountListBody>(res).data.map((a) => a.id)).toContain(
        target.id,
      );
    });

    it('bakiyeye göre sıralar, sayfalar ve bakiyeyi hassas döndürür', async () => {
      const res = await http()
        .get(`/customers/${otherCustomerId}/accounts`)
        .query({ sortBy: 'balance', sortOrder: 'desc', limit: 2, page: 1 })
        .expect(200);

      const body = bodyOf<AccountListBody>(res);
      expect(body.data.map((a) => a.balance)).toEqual([
        '9999999999999999.99',
        '150.50',
      ]);
      expect(body.meta).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });
    });

    it('GET /customers/:id/accounts yalnızca o müşterinin hesaplarını döndürür', async () => {
      const res = await http()
        .get(`/customers/${otherCustomerId}/accounts`)
        .expect(200);

      const body = bodyOf<AccountListBody>(res);
      expect(body.data.map((a) => a.id).sort()).toEqual(
        accounts.map((a) => a.id).sort(),
      );
    });

    it('GET /customers/:id/accounts bulunamayan müşteri için 404 döndürür', async () => {
      await http().get(`/customers/${randomUUID()}/accounts`).expect(404);
    });

    it('GET /customers/:id/accounts geçersiz UUID için 400 döndürür', async () => {
      await http().get('/customers/abc/accounts').expect(400);
    });

    it('GET /customers/:id/accounts query içinde customerId kabul etmez', async () => {
      await http()
        .get(`/customers/${otherCustomerId}/accounts`)
        .query({ customerId })
        .expect(400);
    });

    it('geçersiz sorgu parametrelerinde 400 döndürür', async () => {
      await http()
        .get('/accounts')
        .query({ sortBy: 'customerId', status: 'DELETED', limit: 0 })
        .expect(400);
    });
  });
});
