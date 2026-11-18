import { OmitType } from '@nestjs/mapped-types';
import { AccountStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';

export const ACCOUNT_SORT_FIELDS = [
  'createdAt',
  'accountNumber',
  'balance',
] as const;
export type AccountSortField = (typeof ACCOUNT_SORT_FIELDS)[number];

export class QueryAccountDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(ACCOUNT_SORT_FIELDS, {
    message: `sortBy şunlardan biri olmalıdır: ${ACCOUNT_SORT_FIELDS.join(', ')}`,
  })
  sortBy: AccountSortField = 'createdAt';

  /** Hesap numarası içinde arama. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'search metin olmalıdır' })
  @MaxLength(34, { message: 'search en fazla 34 karakter olabilir' })
  search?: string;

  @IsOptional()
  @IsUUID('all', { message: 'customerId geçerli bir UUID olmalıdır' })
  customerId?: string;

  @IsOptional()
  @IsEnum(AccountStatus, {
    message: `status şunlardan biri olmalıdır: ${Object.values(AccountStatus).join(', ')}`,
  })
  status?: AccountStatus;
}

/**
 * GET /customers/:id/accounts için: müşteri path'ten gelir, bu yüzden
 * query'de customerId kabul edilmez.
 */
export class QueryCustomerAccountsDto extends OmitType(QueryAccountDto, [
  'customerId',
] as const) {}
