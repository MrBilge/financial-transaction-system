import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Account, Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { toMoneyString } from '../common/money';
import { Paginated, SNAPSHOT_READ, toPaginated } from '../common/pagination';
import { CustomersService } from '../customers/customers.service';
import {
  isPrismaError,
  PrismaErrorCode,
  retryOnUniqueViolation,
} from '../prisma/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import {
  QueryAccountDto,
  QueryCustomerAccountsDto,
} from './dto/query-account.dto';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto';

/**
 * Hesap yanıtlarına müşterinin adı eklenir. Prisma ilişkiyi liste için tek bir
 * ek sorguyla (WHERE id IN (...)) getirir; her hesap için ayrı sorgu atılmaz (N+1 yok).
 */
const WITH_CUSTOMER = {
  customer: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.AccountInclude;

type AccountWithCustomer = Prisma.AccountGetPayload<{
  include: typeof WITH_CUSTOMER;
}>;

export interface AccountCustomerSummary {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * API yanıtındaki hesap. Bakiye, hassasiyet kaybı olmasın diye JavaScript
 * number'a çevrilmeden 2 ondalık basamaklı string olarak döner (ör. "1250.50").
 */
export type AccountResponse = Omit<Account, 'balance'> & {
  balance: string;
  customer: AccountCustomerSummary;
};

const ACCOUNT_NUMBER_LENGTH = 16;

@Injectable()
export class AccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customersService: CustomersService,
  ) {}

  /**
   * Müşteri için yeni hesap açar. Bakiye (0) ve durum (ACTIVE) veritabanı
   * varsayılanlarından gelir. Hesap numarası benzersizliği veritabanındaki
   * unique constraint ile garanti edilir; nadir bir çakışmada yeniden denenir.
   */
  async create({ customerId }: CreateAccountDto): Promise<AccountResponse> {
    await this.customersService.findOne(customerId);

    try {
      const account = await retryOnUniqueViolation(() =>
        this.prisma.account.create({
          data: { customerId, accountNumber: generateAccountNumber() },
          include: WITH_CUSTOMER,
        }),
      );
      return toAccountResponse(account);
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.UniqueConstraintFailed)) {
        throw new InternalServerErrorException('Hesap numarası üretilemedi');
      }
      throw error;
    }
  }

  async findAll(query: QueryAccountDto): Promise<Paginated<AccountResponse>> {
    const { page, limit, sortBy, sortOrder, search, customerId, status } =
      query;
    const where: Prisma.AccountWhereInput = {
      customerId,
      status,
      AND: buildSearchFilter(search),
    };

    const [accounts, total] = await this.prisma.$transaction(
      [
        this.prisma.account.findMany({
          where,
          include: WITH_CUSTOMER,
          // id ikincil sıralama: aynı değere sahip kayıtlarda sayfalar arası tutarlılık.
          orderBy: [{ [sortBy]: sortOrder }, { id: 'asc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.account.count({ where }),
      ],
      SNAPSHOT_READ,
    );

    return toPaginated(accounts.map(toAccountResponse), total, query);
  }

  /** Müşterinin hesapları; müşteri yoksa boş liste yerine 404 döner. */
  async findAllByCustomer(
    customerId: string,
    query: QueryCustomerAccountsDto,
  ): Promise<Paginated<AccountResponse>> {
    await this.customersService.findOne(customerId);
    return this.findAll({ ...query, customerId });
  }

  async findOne(id: string): Promise<AccountResponse> {
    const account = await this.prisma.account.findUnique({
      where: { id },
      include: WITH_CUSTOMER,
    });
    if (!account) {
      throw this.notFound(id);
    }
    return toAccountResponse(account);
  }

  async updateStatus(
    id: string,
    { status }: UpdateAccountStatusDto,
  ): Promise<AccountResponse> {
    try {
      const account = await this.prisma.account.update({
        where: { id },
        data: { status },
        include: WITH_CUSTOMER,
      });
      return toAccountResponse(account);
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.RecordNotFound)) {
        throw this.notFound(id);
      }
      throw error;
    }
  }

  private notFound(id: string): NotFoundException {
    return new NotFoundException(`Hesap bulunamadı: ${id}`);
  }
}

function toAccountResponse(account: AccountWithCustomer): AccountResponse {
  return { ...account, balance: toMoneyString(account.balance) };
}

/**
 * Aramadaki her kelime hesap numarası, müşteri adı veya soyadından birinde
 * geçmelidir. Böylece "ayşe 4821" gibi birleşik aramalar da çalışır.
 */
function buildSearchFilter(search?: string): Prisma.AccountWhereInput[] {
  const words = search ? search.split(/\s+/).filter(Boolean) : [];

  return words.map((word) => ({
    OR: [
      { accountNumber: { contains: word } },
      { customer: { firstName: { contains: word, mode: 'insensitive' } } },
      { customer: { lastName: { contains: word, mode: 'insensitive' } } },
    ],
  }));
}

/** Sıfırla başlamayan, kriptografik olarak rastgele 16 haneli hesap numarası. */
function generateAccountNumber(): string {
  let accountNumber = String(randomInt(1, 10));
  while (accountNumber.length < ACCOUNT_NUMBER_LENGTH) {
    accountNumber += String(randomInt(0, 10));
  }
  return accountNumber;
}
