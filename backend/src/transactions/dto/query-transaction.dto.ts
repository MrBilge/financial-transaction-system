import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
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
import { ApiMoneyProperty } from '../../common/api-docs';
import { IsMoneyAmount } from '../../common/money';
import { PaginationQueryDto } from '../../common/pagination';

export const TRANSACTION_SORT_FIELDS = ['createdAt', 'amount'] as const;
export type TransactionSortField = (typeof TRANSACTION_SORT_FIELDS)[number];

const ISO_DATE_MESSAGE =
  '$property ISO 8601 formatında olmalıdır, ör. 2026-11-18 veya 2026-11-18T10:30:00Z';

export class QueryTransactionDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: TRANSACTION_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(TRANSACTION_SORT_FIELDS, {
    message: `sortBy şunlardan biri olmalıdır: ${TRANSACTION_SORT_FIELDS.join(', ')}`,
  })
  sortBy: TransactionSortField = 'createdAt';

  @ApiPropertyOptional({
    maxLength: 64,
    example: 'TRX-20261118',
    description: 'İşlem numarası içinde büyük/küçük harf duyarsız arama',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'search metin olmalıdır' })
  @MaxLength(64, { message: 'search en fazla 64 karakter olabilir' })
  search?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Kaynak veya hedef hesabı bu hesap olan işlemler',
  })
  @IsOptional()
  @IsUUID('all', { message: 'accountId geçerli bir UUID olmalıdır' })
  accountId?: string;

  @ApiPropertyOptional({
    enum: Object.values(TransactionType),
    enumName: 'TransactionType',
  })
  @IsOptional()
  @IsEnum(TransactionType, {
    message: `type şunlardan biri olmalıdır: ${Object.values(TransactionType).join(', ')}`,
  })
  type?: TransactionType;

  @ApiPropertyOptional({
    enum: Object.values(TransactionStatus),
    enumName: 'TransactionStatus',
  })
  @IsOptional()
  @IsEnum(TransactionStatus, {
    message: `status şunlardan biri olmalıdır: ${Object.values(TransactionStatus).join(', ')}`,
  })
  status?: TransactionStatus;

  @ApiPropertyOptional({
    example: '2026-11-01',
    description:
      'Bu an ve sonrası (dahil). ISO 8601; yalnızca tarih verilirse UTC gün başlangıcı.',
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: ISO_DATE_MESSAGE })
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-11-30T23:59:59Z',
    description:
      'Bu an ve öncesi (dahil). ISO 8601; yalnızca tarih verilirse UTC gün başlangıcı.',
  })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: ISO_DATE_MESSAGE })
  endDate?: string;

  @ApiMoneyProperty({
    required: false,
    example: '100',
    description: 'Minimum tutar (dahil)',
  })
  @IsOptional()
  @IsMoneyAmount()
  minAmount?: string;

  @ApiMoneyProperty({
    required: false,
    example: '5000',
    description: 'Maksimum tutar (dahil)',
  })
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
