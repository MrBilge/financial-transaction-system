import { OmitType } from '@nestjs/mapped-types';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { IsMoneyAmount } from '../../common/money';
import { PaginationQueryDto } from '../../common/pagination';

export const TRANSACTION_SORT_FIELDS = ['createdAt', 'amount'] as const;
export type TransactionSortField = (typeof TRANSACTION_SORT_FIELDS)[number];

const ISO_DATE_MESSAGE =
  '$property ISO 8601 formatında olmalıdır, ör. 2026-11-18 veya 2026-11-18T10:30:00Z';

export class QueryTransactionDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(TRANSACTION_SORT_FIELDS, {
    message: `sortBy şunlardan biri olmalıdır: ${TRANSACTION_SORT_FIELDS.join(', ')}`,
  })
  sortBy: TransactionSortField = 'createdAt';

  /** İşlem numarası içinde büyük/küçük harf duyarsız arama. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'search metin olmalıdır' })
  @MaxLength(64, { message: 'search en fazla 64 karakter olabilir' })
  search?: string;

  /** Kaynak veya hedef hesabı bu hesap olan işlemler. */
  @IsOptional()
  @IsUUID('all', { message: 'accountId geçerli bir UUID olmalıdır' })
  accountId?: string;

  @IsOptional()
  @IsEnum(TransactionType, {
    message: `type şunlardan biri olmalıdır: ${Object.values(TransactionType).join(', ')}`,
  })
  type?: TransactionType;

  @IsOptional()
  @IsEnum(TransactionStatus, {
    message: `status şunlardan biri olmalıdır: ${Object.values(TransactionStatus).join(', ')}`,
  })
  status?: TransactionStatus;

  /** Bu tarih ve sonrası (dahil). */
  @IsOptional()
  @IsISO8601({ strict: true }, { message: ISO_DATE_MESSAGE })
  startDate?: string;

  /** Bu tarih ve öncesi (dahil). Yalnızca tarih verilirse günün başlangıcı (UTC) kabul edilir. */
  @IsOptional()
  @IsISO8601({ strict: true }, { message: ISO_DATE_MESSAGE })
  endDate?: string;

  @IsOptional()
  @IsMoneyAmount()
  minAmount?: string;

  @IsOptional()
  @IsMoneyAmount()
  maxAmount?: string;
}

/**
 * GET /accounts/:id/transactions için: hesap path'ten gelir, bu yüzden
 * query'de accountId kabul edilmez.
 */
export class QueryAccountTransactionsDto extends OmitType(QueryTransactionDto, [
  'accountId',
] as const) {}
