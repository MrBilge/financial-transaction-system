import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Veritabanı şemasını gerçek PostgreSQL üzerinde doğrular.
 * Çalışan bir veritabanı ve uygulanmış migration gerektirir
 * (docker compose up -d && npx prisma migrate deploy).
 */
describe('Database schema (e2e)', () => {
  const prisma = new PrismaClient();
  const suffix = randomUUID().slice(0, 8);
  const customerIds: string[] = [];

  let accountA: string;
  let accountB: string;

  const txNumber = () => `TEST-${randomUUID()}`;

  beforeAll(async () => {
    const customer = await prisma.customer.create({
      data: {
        firstName: 'Test',
        lastName: 'Kullanıcı',
        email: `schema-test-${suffix}@example.com`,
        accounts: {
          create: [
            { accountNumber: `TEST-A-${suffix}` },
            { accountNumber: `TEST-B-${suffix}` },
          ],
        },
      },
      include: { accounts: { orderBy: { accountNumber: 'asc' } } },
    });
    customerIds.push(customer.id);
    [accountA, accountB] = customer.accounts.map((a) => a.id);
  });

  afterAll(async () => {
    // Test verisini bağımlılık sırasına göre temizle (cascade kullanılmıyor).
    const accounts = await prisma.account.findMany({
      where: { customerId: { in: customerIds } },
      select: { id: true },
    });
    const ids = accounts.map((a) => a.id);
    await prisma.transaction.deleteMany({
      where: {
        OR: [
          { sourceAccountId: { in: ids } },
          { targetAccountId: { in: ids } },
        ],
      },
    });
    await prisma.account.deleteMany({ where: { id: { in: ids } } });
    await prisma.customer.deleteMany({ where: { id: { in: customerIds } } });
    await prisma.$disconnect();
  });

  describe('yapı', () => {
    it('tabloları oluşturur', async () => {
      const rows = await prisma.$queryRaw<{ table_name: string }[]>`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'
        ORDER BY table_name`;
      expect(rows.map((r) => r.table_name)).toEqual([
        'accounts',
        'customers',
        'transactions',
      ]);
    });

    it('foreign key ilişkilerinde cascade delete kullanmaz', async () => {
      const rows = await prisma.$queryRaw<
        { constraint_name: string; delete_rule: string }[]
      >`
        SELECT constraint_name, delete_rule
        FROM information_schema.referential_constraints
        WHERE constraint_schema = 'public'
        ORDER BY constraint_name`;
      expect(rows).toEqual([
        {
          constraint_name: 'accounts_customer_id_fkey',
          delete_rule: 'RESTRICT',
        },
        {
          constraint_name: 'transactions_source_account_id_fkey',
          delete_rule: 'RESTRICT',
        },
        {
          constraint_name: 'transactions_target_account_id_fkey',
          delete_rule: 'RESTRICT',
        },
      ]);
    });

    it('CHECK constraint ve index tanımlarını içerir', async () => {
      const checks = await prisma.$queryRaw<{ conname: string }[]>`
        SELECT conname FROM pg_constraint
        WHERE contype = 'c' AND connamespace = 'public'::regnamespace
        ORDER BY conname`;
      expect(checks.map((c) => c.conname)).toEqual([
        'accounts_balance_non_negative_check',
        'transactions_amount_positive_check',
        'transactions_failure_reason_check',
        'transactions_type_accounts_check',
      ]);

      const indexes = await prisma.$queryRaw<{ indexname: string }[]>`
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
        ORDER BY indexname`;
      expect(indexes.map((i) => i.indexname)).toEqual([
        'accounts_account_number_key',
        'accounts_customer_id_idx',
        'accounts_pkey',
        'customers_email_key',
        'customers_pkey',
        'transactions_created_at_idx',
        'transactions_pkey',
        'transactions_source_account_id_created_at_idx',
        'transactions_status_created_at_idx',
        'transactions_target_account_id_created_at_idx',
        'transactions_transaction_number_key',
      ]);
    });
  });

  describe('varsayılanlar ve ilişkiler', () => {
    it('UUID, bakiye ve durum varsayılanlarını uygular', async () => {
      const account = await prisma.account.findUniqueOrThrow({
        where: { id: accountA },
      });
      expect(account.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(account.balance).toEqual(new Prisma.Decimal(0));
      expect(account.status).toBe('ACTIVE');
    });

    it('geçerli işlemleri kaydeder ve ilişkiler üzerinden okur', async () => {
      await prisma.transaction.create({
        data: {
          transactionNumber: txNumber(),
          type: 'DEPOSIT',
          targetAccountId: accountA,
          amount: new Prisma.Decimal('100.10'),
          status: 'SUCCESS',
        },
      });
      await prisma.transaction.create({
        data: {
          transactionNumber: txNumber(),
          type: 'TRANSFER',
          sourceAccountId: accountA,
          targetAccountId: accountB,
          amount: new Prisma.Decimal('0.20'),
          status: 'FAILED',
          failureReason: 'Test hatası',
        },
      });

      const account = await prisma.account.findUniqueOrThrow({
        where: { id: accountA },
        include: {
          customer: true,
          incomingTransactions: true,
          outgoingTransactions: true,
        },
      });
      expect(account.customer.id).toBe(customerIds[0]);
      expect(account.incomingTransactions).toHaveLength(1);
      expect(account.outgoingTransactions).toHaveLength(1);
      // Decimal hassasiyeti korunur (Float olsaydı 0.30000000000000004 olurdu).
      expect(
        account.incomingTransactions[0].amount
          .plus(account.outgoingTransactions[0].amount)
          .toString(),
      ).toBe('100.3');
    });
  });

  describe('kısıtlar', () => {
    it('negatif bakiyeyi reddeder', async () => {
      await expect(
        prisma.account.update({
          where: { id: accountA },
          data: { balance: new Prisma.Decimal('-0.01') },
        }),
      ).rejects.toThrow(/accounts_balance_non_negative_check/);
    });

    it.each(['0', '-5'])('%s tutarlı işlemi reddeder', async (amount) => {
      await expect(
        prisma.transaction.create({
          data: {
            transactionNumber: txNumber(),
            type: 'DEPOSIT',
            targetAccountId: accountA,
            amount: new Prisma.Decimal(amount),
          },
        }),
      ).rejects.toThrow(/transactions_amount_positive_check/);
    });

    it.each([
      ['DEPOSIT kaynak hesapla', 'DEPOSIT', true, true],
      ['DEPOSIT hedef hesapsız', 'DEPOSIT', false, false],
      ['WITHDRAWAL hedef hesapla', 'WITHDRAWAL', true, true],
      ['WITHDRAWAL kaynak hesapsız', 'WITHDRAWAL', false, true],
      ['TRANSFER tek hesapla', 'TRANSFER', true, false],
    ] as const)(
      '%s işlemi reddeder',
      async (_label, type, withSource, withTarget) => {
        await expect(
          prisma.transaction.create({
            data: {
              transactionNumber: txNumber(),
              type,
              sourceAccountId: withSource ? accountA : null,
              targetAccountId: withTarget ? accountB : null,
              amount: new Prisma.Decimal('1'),
            },
          }),
        ).rejects.toThrow(/transactions_type_accounts_check/);
      },
    );

    it('aynı hesaba transferi reddeder', async () => {
      await expect(
        prisma.transaction.create({
          data: {
            transactionNumber: txNumber(),
            type: 'TRANSFER',
            sourceAccountId: accountA,
            targetAccountId: accountA,
            amount: new Prisma.Decimal('1'),
          },
        }),
      ).rejects.toThrow(/transactions_type_accounts_check/);
    });

    it('hata nedeni ile durum tutarsızlığını reddeder', async () => {
      const base = {
        type: 'DEPOSIT' as const,
        targetAccountId: accountA,
        amount: new Prisma.Decimal('1'),
      };
      await expect(
        prisma.transaction.create({
          data: { ...base, transactionNumber: txNumber(), status: 'FAILED' },
        }),
      ).rejects.toThrow(/transactions_failure_reason_check/);
      await expect(
        prisma.transaction.create({
          data: {
            ...base,
            transactionNumber: txNumber(),
            status: 'SUCCESS',
            failureReason: 'olmamalı',
          },
        }),
      ).rejects.toThrow(/transactions_failure_reason_check/);
    });

    it('tekrarlanan e-posta ve hesap numarasını reddeder', async () => {
      await expect(
        prisma.customer.create({
          data: {
            firstName: 'X',
            lastName: 'Y',
            email: `schema-test-${suffix}@example.com`,
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
      await expect(
        prisma.account.create({
          data: {
            customerId: customerIds[0],
            accountNumber: `TEST-A-${suffix}`,
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
    });

    it('işlem geçmişi olan hesabın ve hesabı olan müşterinin silinmesini engeller', async () => {
      await expect(
        prisma.account.delete({ where: { id: accountA } }),
      ).rejects.toMatchObject({ code: 'P2003' });
      await expect(
        prisma.customer.delete({ where: { id: customerIds[0] } }),
      ).rejects.toMatchObject({ code: 'P2003' });
    });
  });
});
