import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination';

export const CUSTOMER_SORT_FIELDS = [
  'createdAt',
  'firstName',
  'lastName',
  'email',
] as const;
export type CustomerSortField = (typeof CUSTOMER_SORT_FIELDS)[number];

export class QueryCustomerDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CUSTOMER_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(CUSTOMER_SORT_FIELDS, {
    message: `sortBy şunlardan biri olmalıdır: ${CUSTOMER_SORT_FIELDS.join(', ')}`,
  })
  sortBy: CustomerSortField = 'createdAt';

  @ApiPropertyOptional({
    maxLength: 100,
    example: 'ayşe',
    description:
      'Ad, soyad veya e-posta içinde büyük/küçük harf duyarsız arama',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'search metin olmalıdır' })
  @MaxLength(100, { message: 'search en fazla 100 karakter olabilir' })
  search?: string;
}
