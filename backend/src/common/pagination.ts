import { ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

/** Listeleme endpoint'lerinin ortak sayfalama ve sıralama yönü parametreleri. */
export class PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page tam sayı olmalıdır' })
  @Min(1, { message: 'page en az 1 olmalıdır' })
  page: number = 1;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
    description: 'Sayfa başına kayıt',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit tam sayı olmalıdır' })
  @Min(1, { message: 'limit en az 1 olmalıdır' })
  @Max(100, { message: 'limit en fazla 100 olabilir' })
  limit: number = 10;

  @ApiPropertyOptional({ enum: SORT_ORDERS, default: 'desc' })
  @IsOptional()
  @IsIn(SORT_ORDERS, { message: 'sortOrder asc veya desc olmalıdır' })
  sortOrder: SortOrder = 'desc';
}

export interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function toPaginated<T>(
  data: T[],
  total: number,
  { page, limit }: { page: number; limit: number },
): Paginated<T> {
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Kayıt listesi ve toplam sayının aynı veritabanı snapshot'ından okunması için.
 * PostgreSQL'de REPEATABLE READ, transaction boyunca tek snapshot kullanır;
 * varsayılan READ COMMITTED ise her sorguya ayrı snapshot verir ve araya giren
 * bir yazma işlemi `data` ile `total` arasında tutarsızlık yaratabilir.
 */
export const SNAPSHOT_READ: {
  isolationLevel: Prisma.TransactionIsolationLevel;
} = { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead };
