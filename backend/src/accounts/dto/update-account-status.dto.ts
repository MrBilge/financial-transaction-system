import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

// Yalnızca durum güncellenebilir; bakiye bu endpoint üzerinden değiştirilemez.
export class UpdateAccountStatusDto {
  @ApiProperty({
    enum: Object.values(AccountStatus),
    enumName: 'AccountStatus',
    example: AccountStatus.PASSIVE,
    description: 'PASSIVE hesaplarla para yatırma, çekme ve transfer yapılamaz',
  })
  @IsEnum(AccountStatus, {
    message: `status şunlardan biri olmalıdır: ${Object.values(AccountStatus).join(', ')}`,
  })
  status: AccountStatus;
}
