import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Account, Prisma } from '@prisma/client';
import { CustomersService } from '../customers/customers.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from './accounts.service';
import {
  QueryAccountDto,
  QueryCustomerAccountsDto,
} from './dto/query-account.dto';

const ACCOUNT_ID = '7b1e4c2a-9d3f-4e5a-8b6c-1d2e3f4a5b6c';
const CUSTOMER_ID = '3f1c2b8e-5d7a-4c1e-9b2f-1a2b3c4d5e6f';

const account = (overrides: Partial<Account> = {}): Account => ({
  id: ACCOUNT_ID,
  customerId: CUSTOMER_ID,
  accountNumber: '1234567890123456',
  balance: new Prisma.Decimal(0),
  status: 'ACTIVE',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('prisma error', {
    code,
    clientVersion: 'test',
  });

describe('AccountsService', () => {
  let service: AccountsService;
  const prisma = {
    account: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };
  const customersService = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    customersService.findOne.mockResolvedValue({ id: CUSTOMER_ID });
    const moduleRef = await Test.createTestingModule({
      providers: [
        AccountsService,
        { provide: PrismaService, useValue: prisma },
        { provide: CustomersService, useValue: customersService },
      ],
    }).compile();
    service = moduleRef.get(AccountsService);
  });

  describe('create', () => {
    it('müşteriyi doğrular ve otomatik hesap numarasıyla hesap açar', async () => {
      prisma.account.create.mockResolvedValue(account());

      const result = await service.create({ customerId: CUSTOMER_ID });

      expect(customersService.findOne).toHaveBeenCalledWith(CUSTOMER_ID);
      const [[{ data }]] = prisma.account.create.mock.calls as [
        [{ data: { customerId: string; accountNumber: string } }],
      ];
      // Bakiye ve durum gönderilmez; veritabanı varsayılanları kullanılır.
      expect(Object.keys(data).sort()).toEqual(['accountNumber', 'customerId']);
      expect(data.customerId).toBe(CUSTOMER_ID);
      expect(data.accountNumber).toMatch(/^[1-9]\d{15}$/);
      expect(result).toMatchObject({ balance: '0.00', status: 'ACTIVE' });
    });

    it('müşteri yoksa hesap açmadan NotFoundException fırlatır', async () => {
      customersService.findOne.mockRejectedValue(new NotFoundException());

      await expect(
        service.create({ customerId: CUSTOMER_ID }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.account.create).not.toHaveBeenCalled();
    });

    it('hesap numarası çakışmasında yeni numarayla tekrar dener', async () => {
      prisma.account.create
        .mockRejectedValueOnce(prismaError('P2002'))
        .mockResolvedValueOnce(account());

      await expect(
        service.create({ customerId: CUSTOMER_ID }),
      ).resolves.toBeDefined();
      expect(prisma.account.create).toHaveBeenCalledTimes(2);
    });

    it('tekrar deneme sınırı aşılırsa InternalServerErrorException fırlatır', async () => {
      prisma.account.create.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.create({ customerId: CUSTOMER_ID }),
      ).rejects.toBeInstanceOf(InternalServerErrorException);
      expect(prisma.account.create).toHaveBeenCalledTimes(5);
    });

    it('diğer hataları tekrar denemeden iletir', async () => {
      const error = new Error('bağlantı hatası');
      prisma.account.create.mockRejectedValue(error);

      await expect(service.create({ customerId: CUSTOMER_ID })).rejects.toBe(
        error,
      );
      expect(prisma.account.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('varsayılanlarla, tek snapshot içinde listeler', async () => {
      prisma.account.findMany.mockResolvedValue([account()]);
      prisma.account.count.mockResolvedValue(1);

      const result = await service.findAll(new QueryAccountDto());

      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: {
          customerId: undefined,
          status: undefined,
          accountNumber: undefined,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: 0,
        take: 10,
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Array), {
        isolationLevel: 'RepeatableRead',
      });
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      });
    });

    it('arama, filtre, sıralama ve sayfa parametrelerini uygular', async () => {
      prisma.account.findMany.mockResolvedValue([]);
      prisma.account.count.mockResolvedValue(0);
      const query = Object.assign(new QueryAccountDto(), {
        page: 2,
        limit: 5,
        sortBy: 'balance',
        sortOrder: 'asc',
        search: '1234',
        customerId: CUSTOMER_ID,
        status: 'PASSIVE',
      });

      await service.findAll(query);

      const where = {
        customerId: CUSTOMER_ID,
        status: 'PASSIVE',
        accountNumber: { contains: '1234' },
      };
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where,
        orderBy: [{ balance: 'asc' }, { id: 'asc' }],
        skip: 5,
        take: 5,
      });
      expect(prisma.account.count).toHaveBeenCalledWith({ where });
    });

    it('bakiyeyi hassasiyet kaybı olmadan string olarak döndürür', async () => {
      prisma.account.findMany.mockResolvedValue([
        // 18 basamak: number'a çevrilseydi yuvarlanırdı.
        account({ balance: new Prisma.Decimal('9999999999999999.99') }),
        account({ balance: new Prisma.Decimal('1250.5') }),
      ]);
      prisma.account.count.mockResolvedValue(2);

      const { data } = await service.findAll(new QueryAccountDto());

      expect(data.map((a) => a.balance)).toEqual([
        '9999999999999999.99',
        '1250.50',
      ]);
    });
  });

  describe('findAllByCustomer', () => {
    it('müşteriyi doğrular ve müşteri filtresiyle listeler', async () => {
      prisma.account.findMany.mockResolvedValue([]);
      prisma.account.count.mockResolvedValue(0);

      await service.findAllByCustomer(
        CUSTOMER_ID,
        new QueryCustomerAccountsDto(),
      );

      expect(customersService.findOne).toHaveBeenCalledWith(CUSTOMER_ID);
      expect(prisma.account.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ customerId: CUSTOMER_ID }) as object,
        }),
      );
    });

    it('müşteri yoksa NotFoundException fırlatır', async () => {
      customersService.findOne.mockRejectedValue(new NotFoundException());

      await expect(
        service.findAllByCustomer(CUSTOMER_ID, new QueryCustomerAccountsDto()),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.account.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('hesabı döndürür', async () => {
      prisma.account.findUnique.mockResolvedValue(account());

      await expect(service.findOne(ACCOUNT_ID)).resolves.toMatchObject({
        id: ACCOUNT_ID,
        balance: '0.00',
      });
    });

    it('bulunamazsa NotFoundException fırlatır', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(service.findOne(ACCOUNT_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('yalnızca durumu günceller', async () => {
      prisma.account.update.mockResolvedValue(account({ status: 'PASSIVE' }));

      const result = await service.updateStatus(ACCOUNT_ID, {
        status: 'PASSIVE',
      });

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: ACCOUNT_ID },
        data: { status: 'PASSIVE' },
      });
      expect(result.status).toBe('PASSIVE');
    });

    it('bulunamazsa NotFoundException fırlatır', async () => {
      prisma.account.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.updateStatus(ACCOUNT_ID, { status: 'PASSIVE' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
