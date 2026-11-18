import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
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
  @ApiPropertyOptional({ enum: ACCOUNT_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(ACCOUNT_SORT_FIELDS, {
    message: `sortBy şunlardan biri olmalıdır: ${ACCOUNT_SORT_FIELDS.join(', ')}`,
  })
  sortBy: AccountSortField = 'createdAt';

  @ApiPropertyOptional({
    maxLength: 100,
    example: 'ayşe 4821',
    description:
      'Hesap numarası, müşteri adı veya soyadı içinde arama. Birden fazla kelime girilirse her kelime bu alanlardan birinde geçmelidir.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'search metin olmalıdır' })
  @MaxLength(100, { message: 'search en fazla 100 karakter olabilir' })
  search?: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Müşteriye göre filtre' })
  @IsOptional()
  @IsUUID('all', { message: 'customerId geçerli bir UUID olmalıdır' })
  customerId?: string;

  @ApiPropertyOptional({
    enum: Object.values(AccountStatus),
    enumName: 'AccountStatus',
    description: 'Duruma göre filtre',
  })
  @IsOptional()
  @IsEnum(AccountStatus, {
    message: `status şunlardan biri olmalıdır: ${Object.values(AccountStatus).join(', ')}`,
  })
  status?: AccountStatus;
}

/**
 * GET /customers/:id/accounts için: müşteri path'ten gelir, bu yüzden
 * query'de customerId kabul edilmez. (@nestjs/swagger'ın OmitType'ı
 * validation ve Swagger metadata'sını birlikte taşır.)
 */
export class QueryCustomerAccountsDto extends OmitType(QueryAccountDto, [
  'customerId',
] as const) {}
