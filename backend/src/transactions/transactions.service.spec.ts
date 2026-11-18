import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AccountStatus, Prisma, Transaction } from '@prisma/client';
import { AccountsService } from '../accounts/accounts.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  QueryAccountTransactionsDto,
  QueryTransactionDto,
} from './dto/query-transaction.dto';
import { TransactionsService } from './transactions.service';

// Kilit sırası testleri için: A < B (string karşılaştırması).
const ACCOUNT_A = '11111111-1111-4111-8111-111111111111';
const ACCOUNT_B = '22222222-2222-4222-8222-222222222222';
const TX_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

interface LockedRow {
  id: string;
  status: AccountStatus;
  balance: Prisma.Decimal;
}

const WITH_ACCOUNT_NUMBERS = {
  sourceAccount: { select: { accountNumber: true } },
  targetAccount: { select: { accountNumber: true } },
};

/** Prisma'nın include ile döndürdüğü işlem kaydı (hesap numaralarıyla). */
const transactionRecord = (overrides: Partial<Transaction> = {}) => ({
  id: TX_ID,
  transactionNumber: 'TRX-20261118-AAAAAAAAAAAA',
  sourceAccountId: null,
  targetAccountId: ACCOUNT_A,
  amount: new Prisma.Decimal('100'),
  type: 'DEPOSIT',
  status: 'PENDING',
  failureReason: null,
  createdAt: new Date('2026-11-18T10:00:00Z'),
  sourceAccount: null,
  targetAccount: { accountNumber: '1111222233334444' },
  ...overrides,
});

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('prisma error', {
    code,
    clientVersion: 'test',
  });

describe('TransactionsService', () => {
  let service: TransactionsService;
  let rows: Record<string, LockedRow>;

  // Interactive transaction içindeki istemci (tx).
  const tx = {
    $queryRaw: jest.fn((_sql: TemplateStringsArray, id: string) =>
      Promise.resolve(rows[id] ? [rows[id]] : []),
    ),
    account: { update: jest.fn() },
    transaction: { update: jest.fn() },
  };
  const prisma = {
    transaction: {
      create: jest.fn(),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const accountsService = { findOne: jest.fn() };

  const lockedIds = () => tx.$queryRaw.mock.calls.map(([, id]) => id);

  beforeEach(async () => {
    jest.clearAllMocks();
    rows = {
      [ACCOUNT_A]: {
        id: ACCOUNT_A,
        status: 'ACTIVE',
        balance: new Prisma.Decimal('1000.00'),
      },
      [ACCOUNT_B]: {
        id: ACCOUNT_B,
        status: 'ACTIVE',
        balance: new Prisma.Decimal('50.00'),
      },
    };
    accountsService.findOne.mockResolvedValue({});
    prisma.transaction.create.mockImplementation(
      ({ data }: { data: Partial<Transaction> }) =>
        Promise.resolve(transactionRecord({ ...data, status: 'PENDING' })),
    );
    // Interactive transaction: callback tx istemcisiyle çalıştırılır;
    // callback hata fırlatırsa Prisma gibi hatayı iletir (rollback).
    prisma.$transaction.mockImplementation(
      (arg: ((client: typeof tx) => unknown) | Promise<unknown>[]) =>
        typeof arg === 'function' ? arg(tx) : Promise.all(arg),
    );
    tx.transaction.update.mockImplementation(
      ({ data }: { data: Partial<Transaction> }) =>
        Promise.resolve(transactionRecord({ ...data })),
    );
    prisma.transaction.findUniqueOrThrow.mockImplementation(() =>
      Promise.resolve(
        transactionRecord({ status: 'FAILED', failureReason: 'neden' }),
      ),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccountsService, useValue: accountsService },
      ],
    }).compile();
    service = moduleRef.get(TransactionsService);
  });

  describe('deposit', () => {
    it('PENDING kayıt oluşturur, kilitleyip bakiyeyi artırır ve SUCCESS yapar', async () => {
      const result = await service.deposit({
        accountId: ACCOUNT_A,
        amount: '100.10',
      });

      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'DEPOSIT',
          targetAccountId: ACCOUNT_A,
          amount: '100.10',
          transactionNumber: expect.stringMatching(
            /^TRX-\d{8}-[0-9A-F]{12}$/,
          ) as string,
        }) as object,
      });
      expect(lockedIds()).toEqual([ACCOUNT_A]);
      expect(tx.account.update).toHaveBeenCalledWith({
        where: { id: ACCOUNT_A },
        data: { balance: { increment: new Prisma.Decimal('100.10') } },
      });
      expect(tx.transaction.update).toHaveBeenCalledWith({
        where: { id: TX_ID, status: 'PENDING' },
        data: { status: 'SUCCESS' },
        include: WITH_ACCOUNT_NUMBERS,
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        isolationLevel: 'ReadCommitted',
        maxWait: 5000,
        timeout: 10000,
      });
      // Mock kayıt tutarı 100; yanıtta string ve 2 ondalık basamaklı olmalı.
      expect(result).toMatchObject({
        status: 'SUCCESS',
        amount: '100.00',
        sourceAccountNumber: null,
        targetAccountNumber: '1111222233334444',
      });
      // Prisma ilişki alanları yanıta sızmaz; yalnızca hesap numaraları döner.
      expect(result).not.toHaveProperty('targetAccount');
    });

    it('hedef hesap pasifse 422 döner ve işlem FAILED kaydedilir', async () => {
      rows[ACCOUNT_A].status = 'PASSIVE';

      const error = await service
        .deposit({ accountId: ACCOUNT_A, amount: '10' })
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(
        (error as UnprocessableEntityException).getResponse(),
      ).toMatchObject({
        statusCode: 422,
        message: 'Hedef hesap aktif değil',
        transaction: { status: 'FAILED' },
      });
      expect(tx.account.update).not.toHaveBeenCalled();
      expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
        where: { id: TX_ID, status: 'PENDING' },
        data: { status: 'FAILED', failureReason: 'Hedef hesap aktif değil' },
      });
    });

    it('hesap yoksa 404 döner ve kayıt oluşturulmaz', async () => {
      accountsService.findOne.mockRejectedValue(new NotFoundException());

      await expect(
        service.deposit({ accountId: ACCOUNT_A, amount: '10' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it('işlem numarası çakışmasında yeni numarayla tekrar dener', async () => {
      prisma.transaction.create.mockRejectedValueOnce(prismaError('P2002'));

      await service.deposit({ accountId: ACCOUNT_A, amount: '10' });

      const numbers = prisma.transaction.create.mock.calls.map(
        ([{ data }]: [{ data: { transactionNumber: string } }]) =>
          data.transactionNumber,
      );
      expect(numbers).toHaveLength(2);
    });
  });

  describe('withdraw', () => {
    it('bakiye yeterliyse bakiyeyi azaltır', async () => {
      await service.withdraw({ accountId: ACCOUNT_A, amount: '1000.00' });

      expect(tx.account.update).toHaveBeenCalledWith({
        where: { id: ACCOUNT_A },
        data: { balance: { decrement: new Prisma.Decimal('1000.00') } },
      });
    });

    it('yetersiz bakiyede 422 döner, bakiye değişmez ve FAILED kaydedilir', async () => {
      await expect(
        service.withdraw({ accountId: ACCOUNT_A, amount: '1000.01' }),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);

      expect(tx.account.update).not.toHaveBeenCalled();
      expect(tx.transaction.update).not.toHaveBeenCalled();
      expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
        where: { id: TX_ID, status: 'PENDING' },
        data: { status: 'FAILED', failureReason: 'Yetersiz bakiye' },
      });
    });

    it('kaynak hesap pasifse 422 döner', async () => {
      rows[ACCOUNT_A].status = 'PASSIVE';

      await expect(
        service.withdraw({ accountId: ACCOUNT_A, amount: '1' }),
      ).rejects.toMatchObject({
        response: { message: 'Kaynak hesap aktif değil' },
      });
    });
  });

  describe('transfer', () => {
    it('hesapları id sırasıyla kilitler ve iki bakiyeyi de günceller', async () => {
      // Kaynak B, hedef A olsa da kilit sırası A, B olmalı.
      rows[ACCOUNT_B].balance = new Prisma.Decimal('500');

      await service.transfer({
        sourceAccountId: ACCOUNT_B,
        targetAccountId: ACCOUNT_A,
        amount: '200',
      });

      expect(lockedIds()).toEqual([ACCOUNT_A, ACCOUNT_B]);
      expect(tx.account.update).toHaveBeenNthCalledWith(1, {
        where: { id: ACCOUNT_B },
        data: { balance: { decrement: new Prisma.Decimal('200') } },
      });
      expect(tx.account.update).toHaveBeenNthCalledWith(2, {
        where: { id: ACCOUNT_A },
        data: { balance: { increment: new Prisma.Decimal('200') } },
      });
    });

    it('aynı hesaba transferde 400 döner ve kayıt oluşturulmaz', async () => {
      await expect(
        service.transfer({
          sourceAccountId: ACCOUNT_A,
          targetAccountId: ACCOUNT_A,
          amount: '1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });

    it('hedef hesap pasifse hiçbir bakiye değişmez', async () => {
      rows[ACCOUNT_B].status = 'PASSIVE';

      await expect(
        service.transfer({
          sourceAccountId: ACCOUNT_A,
          targetAccountId: ACCOUNT_B,
          amount: '1',
        }),
      ).rejects.toMatchObject({
        response: { message: 'Hedef hesap aktif değil' },
      });
      expect(tx.account.update).not.toHaveBeenCalled();
    });

    it('beklenmeyen hatada FAILED kaydeder ve orijinal hatayı iletir', async () => {
      const dbError = new Error('numeric field overflow');
      tx.account.update
        .mockResolvedValueOnce({}) // kaynaktan düşüldü
        .mockRejectedValueOnce(dbError); // hedefte hata -> rollback

      await expect(
        service.transfer({
          sourceAccountId: ACCOUNT_A,
          targetAccountId: ACCOUNT_B,
          amount: '1',
        }),
      ).rejects.toBe(dbError);
      expect(tx.transaction.update).not.toHaveBeenCalled();
      expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
        where: { id: TX_ID, status: 'PENDING' },
        data: {
          status: 'FAILED',
          failureReason: 'İşlem beklenmeyen bir hata nedeniyle tamamlanamadı',
        },
      });
    });
  });

  describe('findAll', () => {
    const query = (overrides: Partial<QueryTransactionDto> = {}) =>
      Object.assign(new QueryTransactionDto(), overrides);

    beforeEach(() => {
      prisma.transaction.findMany.mockResolvedValue([
        transactionRecord({
          amount: new Prisma.Decimal('9999999999999999.99'),
        }),
      ]);
      prisma.transaction.count.mockResolvedValue(1);
    });

    it('tüm filtreleri uygular ve tek snapshot içinde listeler', async () => {
      const result = await service.findAll(
        query({
          page: 2,
          limit: 5,
          sortBy: 'amount',
          sortOrder: 'asc',
          search: 'trx-2026',
          accountId: ACCOUNT_A,
          type: 'TRANSFER',
          status: 'SUCCESS',
          startDate: '2026-11-01',
          endDate: '2026-11-30T23:59:59Z',
          minAmount: '10',
          maxAmount: '500.50',
        }),
      );

      const where = {
        type: 'TRANSFER',
        status: 'SUCCESS',
        transactionNumber: { contains: 'trx-2026', mode: 'insensitive' },
        createdAt: {
          gte: new Date('2026-11-01T00:00:00Z'),
          lte: new Date('2026-11-30T23:59:59Z'),
        },
        amount: { gte: '10', lte: '500.50' },
        OR: [{ sourceAccountId: ACCOUNT_A }, { targetAccountId: ACCOUNT_A }],
      };
      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where,
        include: WITH_ACCOUNT_NUMBERS,
        orderBy: [{ amount: 'asc' }, { id: 'asc' }],
        skip: 5,
        take: 5,
      });
      expect(prisma.transaction.count).toHaveBeenCalledWith({ where });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Array), {
        isolationLevel: 'RepeatableRead',
      });
      expect(result.data[0].amount).toBe('9999999999999999.99');
    });

    it('başlangıç tarihi bitişten sonraysa 400 döner', async () => {
      await expect(
        service.findAll(
          query({ startDate: '2026-12-01', endDate: '2026-11-01' }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('minimum tutar maksimumdan büyükse 400 döner', async () => {
      await expect(
        service.findAll(query({ minAmount: '100.01', maxAmount: '100' })),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findAllByAccount', () => {
    it('hesabı doğrular ve hesap filtresiyle listeler', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      await service.findAllByAccount(
        ACCOUNT_A,
        new QueryAccountTransactionsDto(),
      );

      expect(accountsService.findOne).toHaveBeenCalledWith(ACCOUNT_A);
      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { sourceAccountId: ACCOUNT_A },
              { targetAccountId: ACCOUNT_A },
            ],
          }) as object,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('işlemi döndürür', async () => {
      prisma.transaction.findUnique.mockResolvedValue(transactionRecord());

      await expect(service.findOne(TX_ID)).resolves.toMatchObject({
        id: TX_ID,
        amount: '100.00',
      });
    });

    it('bulunamazsa 404 döner', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);

      await expect(service.findOne(TX_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
