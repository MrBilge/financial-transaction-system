import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  AccountStatus,
  Prisma,
  Transaction,
  TransactionStatus,
  TransactionType,
} from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { AccountsService } from '../accounts/accounts.service';
import { toMoneyString } from '../common/money';
import { Paginated, SNAPSHOT_READ, toPaginated } from '../common/pagination';
import { retryOnUniqueViolation } from '../prisma/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { AccountOperationDto } from './dto/account-operation.dto';
import {
  QueryAccountTransactionsDto,
  QueryTransactionDto,
} from './dto/query-transaction.dto';
import { TransferDto } from './dto/transfer.dto';

/** API yanıtındaki işlem; tutar 2 ondalık basamaklı string olarak döner. */
export type TransactionResponse = Omit<Transaction, 'amount'> & {
  amount: string;
  /** Kaynak hesabın numarası (DEPOSIT için null). */
  sourceAccountNumber: string | null;
  /** Hedef hesabın numarası (WITHDRAWAL için null). */
  targetAccountNumber: string | null;
};

/**
 * İşlem yanıtlarına kaynak ve hedef hesap numaraları eklenir. Prisma her
 * ilişkiyi liste için tek bir ek sorguyla (WHERE id IN (...)) getirir; her
 * işlem için ayrı sorgu atılmaz (N+1 yok).
 */
const WITH_ACCOUNT_NUMBERS = {
  sourceAccount: { select: { accountNumber: true } },
  targetAccount: { select: { accountNumber: true } },
} satisfies Prisma.TransactionInclude;

type TransactionWithAccountNumbers = Prisma.TransactionGetPayload<{
  include: typeof WITH_ACCOUNT_NUMBERS;
}>;

/** Bir para hareketi: DEPOSIT yalnızca hedef, WITHDRAWAL yalnızca kaynak, TRANSFER ikisini de içerir. */
interface MoneyMovement {
  type: TransactionType;
  sourceAccountId?: string;
  targetAccountId?: string;
  amount: string;
}

/** SELECT ... FOR UPDATE ile kilitlenmiş hesap satırı. */
interface LockedAccount {
  id: string;
  status: AccountStatus;
  balance: Prisma.Decimal;
}

/**
 * İş kuralı ihlali (pasif hesap, yetersiz bakiye). Veritabanı transaction'ı
 * içinde fırlatılır; transaction rollback edilir, işlem FAILED olarak
 * kaydedilir ve istemciye 422 döner.
 */
class TransactionRejectedError extends Error {}

/**
 * READ COMMITTED + SELECT FOR UPDATE: kilit alındıktan sonra okunan satır her
 * zaman en son commit edilmiş değerdir. maxWait/timeout, kilit bekleyen
 * isteklerin bağlantı havuzunda ve transaction içinde makul süre kalmasını sağlar.
 */
const MONEY_MOVEMENT_TX_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  maxWait: 5_000,
  timeout: 10_000,
};

const UNEXPECTED_FAILURE_REASON =
  'İşlem beklenmeyen bir hata nedeniyle tamamlanamadı';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
  ) {}

  async deposit({
    accountId,
    amount,
  }: AccountOperationDto): Promise<TransactionResponse> {
    return this.execute({
      type: TransactionType.DEPOSIT,
      targetAccountId: accountId,
      amount,
    });
  }

  async withdraw({
    accountId,
    amount,
  }: AccountOperationDto): Promise<TransactionResponse> {
    return this.execute({
      type: TransactionType.WITHDRAWAL,
      sourceAccountId: accountId,
      amount,
    });
  }

  async transfer({
    sourceAccountId,
    targetAccountId,
    amount,
  }: TransferDto): Promise<TransactionResponse> {
    // CHECK constraint aynı hesaplı transferi kaydetmeye izin vermez;
    // bu yüzden FAILED kaydı oluşturulmadan doğrudan 400 döner.
    if (sourceAccountId === targetAccountId) {
      throw new BadRequestException('Aynı hesaba transfer yapılamaz');
    }
    return this.execute({
      type: TransactionType.TRANSFER,
      sourceAccountId,
      targetAccountId,
      amount,
    });
  }

  async findAll(
    query: QueryTransactionDto,
  ): Promise<Paginated<TransactionResponse>> {
    const { page, limit, sortBy, sortOrder } = query;
    const where = this.buildFilter(query);

    const [transactions, total] = await this.prisma.$transaction(
      [
        this.prisma.transaction.findMany({
          where,
          include: WITH_ACCOUNT_NUMBERS,
          // id ikincil sıralama: aynı değere sahip kayıtlarda sayfalar arası tutarlılık.
          orderBy: [{ [sortBy]: sortOrder }, { id: 'asc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.transaction.count({ where }),
      ],
      SNAPSHOT_READ,
    );

    return toPaginated(transactions.map(toTransactionResponse), total, query);
  }

  /** Hesabın gelen ve giden işlemleri; hesap yoksa boş liste yerine 404 döner. */
  async findAllByAccount(
    accountId: string,
    query: QueryAccountTransactionsDto,
  ): Promise<Paginated<TransactionResponse>> {
    await this.accountsService.findOne(accountId);
    return this.findAll({ ...query, accountId });
  }

  async findOne(id: string): Promise<TransactionResponse> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: WITH_ACCOUNT_NUMBERS,
    });
    if (!transaction) {
      throw new NotFoundException(`İşlem bulunamadı: ${id}`);
    }
    return toTransactionResponse(transaction);
  }

  /**
   * Para hareketinin yaşam döngüsü:
   *  1. Hesapların varlığı doğrulanır (yoksa 404, kayıt oluşturulmaz).
   *  2. İşlem PENDING olarak ayrı ve hemen commit edilen bir sorguyla kaydedilir.
   *  3. Tek bir veritabanı transaction'ı içinde hesaplar kilitlenir, kurallar
   *     kontrol edilir, bakiyeler güncellenir ve işlem SUCCESS yapılır.
   *  4. Hata olursa 3. adımdaki her şey rollback edilir; PENDING kayıt ise
   *     rollback'ten etkilenmediği için FAILED + neden ile güncellenir.
   */
  private async execute(movement: MoneyMovement): Promise<TransactionResponse> {
    await this.assertAccountsExist(movement);
    const pending = await this.createPending(movement);

    try {
      const completed = await this.prisma.$transaction(async (tx) => {
        await this.applyBalanceChanges(tx, movement);
        return tx.transaction.update({
          where: { id: pending.id, status: TransactionStatus.PENDING },
          data: { status: TransactionStatus.SUCCESS },
          include: WITH_ACCOUNT_NUMBERS,
        });
      }, MONEY_MOVEMENT_TX_OPTIONS);
      return toTransactionResponse(completed);
    } catch (error) {
      if (error instanceof TransactionRejectedError) {
        const failed = await this.markFailed(pending.id, error.message);
        throw new UnprocessableEntityException({
          statusCode: 422,
          error: 'Unprocessable Entity',
          message: error.message,
          transaction: toTransactionResponse(failed),
        });
      }
      await this.markFailed(pending.id, UNEXPECTED_FAILURE_REASON).catch(
        (markError: unknown) =>
          this.logger.error(
            `İşlem FAILED olarak işaretlenemedi: ${pending.id}`,
            markError instanceof Error ? markError.stack : markError,
          ),
      );
      throw error;
    }
  }

  private async assertAccountsExist({
    sourceAccountId,
    targetAccountId,
  }: MoneyMovement): Promise<void> {
    for (const id of [sourceAccountId, targetAccountId]) {
      if (id) {
        await this.accountsService.findOne(id);
      }
    }
  }

  private createPending(movement: MoneyMovement): Promise<Transaction> {
    return retryOnUniqueViolation(() =>
      this.prisma.transaction.create({
        data: { ...movement, transactionNumber: generateTransactionNumber() },
      }),
    );
  }

  /**
   * Veritabanı transaction'ı içinde çalışır. Kontroller kilit alındıktan sonra
   * yapılır; böylece eş zamanlı başka bir işlem veya hesap durumu güncellemesi
   * kontrol ile güncelleme arasına giremez.
   */
  private async applyBalanceChanges(
    tx: Prisma.TransactionClient,
    { sourceAccountId, targetAccountId, amount }: MoneyMovement,
  ): Promise<void> {
    const locked = await this.lockAccounts(tx, [
      sourceAccountId,
      targetAccountId,
    ]);
    const source = sourceAccountId ? locked.get(sourceAccountId) : undefined;
    const target = targetAccountId ? locked.get(targetAccountId) : undefined;
    const value = new Prisma.Decimal(amount);

    if (source && source.status !== AccountStatus.ACTIVE) {
      throw new TransactionRejectedError('Kaynak hesap aktif değil');
    }
    if (target && target.status !== AccountStatus.ACTIVE) {
      throw new TransactionRejectedError('Hedef hesap aktif değil');
    }
    if (source && source.balance.lessThan(value)) {
      throw new TransactionRejectedError('Yetersiz bakiye');
    }

    if (source) {
      await tx.account.update({
        where: { id: source.id },
        data: { balance: { decrement: value } },
      });
    }
    if (target) {
      await tx.account.update({
        where: { id: target.id },
        data: { balance: { increment: value } },
      });
    }
  }

  /**
   * Hesap satırlarını SELECT ... FOR UPDATE ile kilitler. Kilitler her zaman
   * id'ye göre artan sırada alınır: A→B ve B→A transferleri aynı anda gelse
   * bile ikisi de önce aynı satırı kilitlemeye çalışır, bu yüzden birbirini
   * karşılıklı bekleyerek deadlock'a giremez.
   */
  private async lockAccounts(
    tx: Prisma.TransactionClient,
    accountIds: (string | undefined)[],
  ): Promise<Map<string, LockedAccount>> {
    const ids = accountIds.filter((id): id is string => !!id).sort();
    const locked = new Map<string, LockedAccount>();

    for (const id of ids) {
      const [account] = await tx.$queryRaw<LockedAccount[]>`
        SELECT id, status, balance FROM accounts
        WHERE id = ${id}::uuid
        FOR UPDATE`;
      if (!account) {
        throw new NotFoundException(`Hesap bulunamadı: ${id}`);
      }
      locked.set(id, account);
    }
    return locked;
  }

  /**
   * Yalnızca hâlâ PENDING olan kaydı FAILED yapar. Commit sonucu belirsiz bir
   * hatada (ör. bağlantı COMMIT sırasında koptu) işlem aslında SUCCESS olarak
   * commit edilmiş olabilir; bu koşul o kaydın üzerine yazılmasını engeller.
   */
  private async markFailed(
    id: string,
    reason: string,
  ): Promise<TransactionWithAccountNumbers> {
    await this.prisma.transaction.updateMany({
      where: { id, status: TransactionStatus.PENDING },
      data: { status: TransactionStatus.FAILED, failureReason: reason },
    });
    return this.prisma.transaction.findUniqueOrThrow({
      where: { id },
      include: WITH_ACCOUNT_NUMBERS,
    });
  }

  private buildFilter(
    query: QueryTransactionDto,
  ): Prisma.TransactionWhereInput {
    const {
      search,
      accountId,
      type,
      status,
      startDate,
      endDate,
      minAmount,
      maxAmount,
    } = query;
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    if (start && end && start > end) {
      throw new BadRequestException(
        'startDate, endDate değerinden sonra olamaz',
      );
    }
    if (
      minAmount &&
      maxAmount &&
      new Prisma.Decimal(minAmount).greaterThan(maxAmount)
    ) {
      throw new BadRequestException(
        'minAmount, maxAmount değerinden büyük olamaz',
      );
    }

    // undefined değerler Prisma tarafından filtreye eklenmez.
    return {
      type,
      status,
      transactionNumber: search
        ? { contains: search, mode: 'insensitive' }
        : undefined,
      createdAt: { gte: start, lte: end },
      amount: { gte: minAmount, lte: maxAmount },
      OR: accountId
        ? [{ sourceAccountId: accountId }, { targetAccountId: accountId }]
        : undefined,
    };
  }
}

function toTransactionResponse({
  sourceAccount,
  targetAccount,
  ...transaction
}: TransactionWithAccountNumbers): TransactionResponse {
  return {
    ...transaction,
    amount: toMoneyString(transaction.amount),
    sourceAccountNumber: sourceAccount?.accountNumber ?? null,
    targetAccountNumber: targetAccount?.accountNumber ?? null,
  };
}

/** Ör. TRX-20261118-9F3A1C7B2E4D: tarih + 48 bit kriptografik rastgelelik. */
function generateTransactionNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const random = randomBytes(6).toString('hex').toUpperCase();
  return `TRX-${date}-${random}`;
}
