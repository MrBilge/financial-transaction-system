import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const CUSTOMER_SORT_FIELDS = [
  'createdAt',
  'firstName',
  'lastName',
  'email',
] as const;
export type CustomerSortField = (typeof CUSTOMER_SORT_FIELDS)[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export class QueryCustomerDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page tam sayı olmalıdır' })
  @Min(1, { message: 'page en az 1 olmalıdır' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit tam sayı olmalıdır' })
  @Min(1, { message: 'limit en az 1 olmalıdır' })
  @Max(100, { message: 'limit en fazla 100 olabilir' })
  limit: number = 10;

  @IsOptional()
  @IsIn(CUSTOMER_SORT_FIELDS, {
    message: `sortBy şunlardan biri olmalıdır: ${CUSTOMER_SORT_FIELDS.join(', ')}`,
  })
  sortBy: CustomerSortField = 'createdAt';

  @IsOptional()
  @IsIn(SORT_ORDERS, { message: 'sortOrder asc veya desc olmalıdır' })
  sortOrder: SortOrder = 'desc';

  /** Ad, soyad veya e-posta içinde büyük/küçük harf duyarsız arama. */
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'search metin olmalıdır' })
  @MaxLength(100, { message: 'search en fazla 100 karakter olabilir' })
  search?: string;
}
