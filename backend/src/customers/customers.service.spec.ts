import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Customer, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CustomersService } from './customers.service';
import { QueryCustomerDto } from './dto/query-customer.dto';

const ID = '3f1c2b8e-5d7a-4c1e-9b2f-1a2b3c4d5e6f';

const customer: Customer = {
  id: ID,
  firstName: 'Ayşe',
  lastName: 'Yılmaz',
  email: 'ayse@example.com',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('prisma error', {
    code,
    clientVersion: 'test',
  });

describe('CustomersService', () => {
  let service: CustomersService;
  const prisma = {
    customer: {
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

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(CustomersService);
  });

  describe('create', () => {
    const dto = {
      firstName: 'Ayşe',
      lastName: 'Yılmaz',
      email: 'ayse@example.com',
    };

    it('müşteriyi oluşturur', async () => {
      prisma.customer.create.mockResolvedValue(customer);

      await expect(service.create(dto)).resolves.toEqual(customer);
      expect(prisma.customer.create).toHaveBeenCalledWith({ data: dto });
    });

    it('tekrarlanan e-postada ConflictException fırlatır', async () => {
      prisma.customer.create.mockRejectedValue(prismaError('P2002'));

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('bilinmeyen hataları olduğu gibi iletir', async () => {
      const error = new Error('bağlantı hatası');
      prisma.customer.create.mockRejectedValue(error);

      await expect(service.create(dto)).rejects.toBe(error);
    });
  });

  describe('findAll', () => {
    const query = (overrides: Partial<QueryCustomerDto> = {}) =>
      Object.assign(new QueryCustomerDto(), overrides);

    it('varsayılan sayfalama ve sıralamayı uygular', async () => {
      prisma.customer.findMany.mockResolvedValue([customer]);
      prisma.customer.count.mockResolvedValue(1);

      const result = await service.findAll(query());

      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        data: [customer],
        meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Array), {
        isolationLevel: 'RepeatableRead',
      });
    });

    it('arama, sıralama ve sayfa parametrelerini uygular', async () => {
      prisma.customer.findMany.mockResolvedValue([]);
      prisma.customer.count.mockResolvedValue(25);

      const result = await service.findAll(
        query({
          page: 3,
          limit: 5,
          sortBy: 'lastName',
          sortOrder: 'asc',
          search: 'ayş',
        }),
      );

      const contains = { contains: 'ayş', mode: 'insensitive' };
      const where = {
        OR: [
          { firstName: contains },
          { lastName: contains },
          { email: contains },
        ],
      };
      expect(prisma.customer.findMany).toHaveBeenCalledWith({
        where,
        orderBy: [{ lastName: 'asc' }, { id: 'asc' }],
        skip: 10,
        take: 5,
      });
      expect(prisma.customer.count).toHaveBeenCalledWith({ where });
      expect(result.meta).toEqual({
        page: 3,
        limit: 5,
        total: 25,
        totalPages: 5,
      });
    });
  });

  describe('findOne', () => {
    it('müşteriyi döndürür', async () => {
      prisma.customer.findUnique.mockResolvedValue(customer);

      await expect(service.findOne(ID)).resolves.toEqual(customer);
      expect(prisma.customer.findUnique).toHaveBeenCalledWith({
        where: { id: ID },
      });
    });

    it('bulunamazsa NotFoundException fırlatır', async () => {
      prisma.customer.findUnique.mockResolvedValue(null);

      await expect(service.findOne(ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('müşteriyi günceller', async () => {
      const updated = { ...customer, lastName: 'Kaya' };
      prisma.customer.update.mockResolvedValue(updated);

      await expect(service.update(ID, { lastName: 'Kaya' })).resolves.toEqual(
        updated,
      );
      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: ID },
        data: { lastName: 'Kaya' },
      });
    });

    it('bulunamazsa NotFoundException fırlatır', async () => {
      prisma.customer.update.mockRejectedValue(prismaError('P2025'));

      await expect(
        service.update(ID, { lastName: 'Kaya' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('tekrarlanan e-postada ConflictException fırlatır', async () => {
      prisma.customer.update.mockRejectedValue(prismaError('P2002'));

      await expect(
        service.update(ID, { email: 'taken@example.com' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
