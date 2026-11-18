import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, Matches } from 'class-validator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Rapor tarih aralığı. Tarihler gün bazındadır (YYYY-MM-DD) ve rapor saat
 * diliminde (Europe/Istanbul) yorumlanır; iki uç da dahildir.
 */
export class ReportPeriodQueryDto {
  @ApiPropertyOptional({
    format: 'date',
    example: '2026-11-01',
    description: 'Başlangıç günü (dahil, Europe/Istanbul)',
  })
  @IsOptional()
  @Matches(DATE_ONLY, { message: '$property YYYY-MM-DD formatında olmalıdır' })
  @IsISO8601(
    { strict: true },
    { message: '$property geçerli bir tarih olmalıdır' },
  )
  startDate?: string;

  @ApiPropertyOptional({
    format: 'date',
    example: '2026-11-30',
    description: 'Bitiş günü (dahil, Europe/Istanbul)',
  })
  @IsOptional()
  @Matches(DATE_ONLY, { message: '$property YYYY-MM-DD formatında olmalıdır' })
  @IsISO8601(
    { strict: true },
    { message: '$property geçerli bir tarih olmalıdır' },
  )
  endDate?: string;
}
