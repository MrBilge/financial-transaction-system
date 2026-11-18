import { IsIn, IsOptional } from 'class-validator';
import { ReportPeriodQueryDto } from './report-period-query.dto';

export const VOLUME_INTERVALS = ['daily', 'weekly', 'monthly'] as const;
export type VolumeInterval = (typeof VOLUME_INTERVALS)[number];

export class VolumeQueryDto extends ReportPeriodQueryDto {
  @IsOptional()
  @IsIn(VOLUME_INTERVALS, {
    message: `interval şunlardan biri olmalıdır: ${VOLUME_INTERVALS.join(', ')}`,
  })
  interval: VolumeInterval = 'daily';
}
