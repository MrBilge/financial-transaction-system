import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Account, Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { Paginated, SNAPSHOT_READ, toPaginated } from '../common/pagination';
import { CustomersService } from '../customers/customers.service';
import { isPrismaError, PrismaErrorCode } from '../prisma/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import {
  QueryAccountDto,
  QueryCustomerAccountsDto,
} from './dto/query-account.dto';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto';

/**
 * API yanıtındaki hesap. Bakiye, hassasiyet kaybı olmasın diye JavaScript
 * number'a çevrilmeden 2 ondalık basamaklı string olarak döner (ör. "1250.50").
 */
export type AccountResponse = Omit<Account, 'balance'> & { balance: string };

const ACCOUNT_NUMBER_LENGTH = 16;
const MAX_ACCOUNT_NUMBER_ATTEMPTS = 5;

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

    for (let attempt = 1; attempt <= MAX_ACCOUNT_NUMBER_ATTEMPTS; attempt++) {
      try {
        const account = await this.prisma.account.create({
          data: { customerId, accountNumber: generateAccountNumber() },
        });
        return toAccountResponse(account);
      } catch (error) {
        if (!isPrismaError(error, PrismaErrorCode.UniqueConstraintFailed)) {
          throw error;
        }
      }
    }
    throw new InternalServerErrorException('Hesap numarası üretilemedi');
  }

  async findAll(query: QueryAccountDto): Promise<Paginated<AccountResponse>> {
    const { page, limit, sortBy, sortOrder, search, customerId, status } =
      query;
    const where: Prisma.AccountWhereInput = {
      customerId,
      status,
      accountNumber: search ? { contains: search } : undefined,
    };

    const [accounts, total] = await this.prisma.$transaction(
      [
        this.prisma.account.findMany({
          where,
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
    const account = await this.prisma.account.findUnique({ where: { id } });
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

function toAccountResponse(account: Account): AccountResponse {
  // Decimal -> string: number dönüşümü yapılmadığı için hassasiyet korunur.
  return { ...account, balance: account.balance.toFixed(2) };
}

/** Sıfırla başlamayan, kriptografik olarak rastgele 16 haneli hesap numarası. */
function generateAccountNumber(): string {
  let accountNumber = String(randomInt(1, 10));
  while (accountNumber.length < ACCOUNT_NUMBER_LENGTH) {
    accountNumber += String(randomInt(0, 10));
  }
  return accountNumber;
}
