import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { ReportPeriodQueryDto } from './report-period-query.dto';

export const VOLUME_INTERVALS = ['daily', 'weekly', 'monthly'] as const;
export type VolumeInterval = (typeof VOLUME_INTERVALS)[number];

export class VolumeQueryDto extends ReportPeriodQueryDto {
  @ApiPropertyOptional({
    enum: VOLUME_INTERVALS,
    default: 'daily',
    description:
      'Gruplama aralığı. Tarih verilmezse son 30 gün / 12 hafta / 12 ay döner; en fazla 1000 periyot.',
  })
  @IsOptional()
  @IsIn(VOLUME_INTERVALS, {
    message: `interval şunlardan biri olmalıdır: ${VOLUME_INTERVALS.join(', ')}`,
  })
  interval: VolumeInterval = 'daily';
}
