import { AccountStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

// Yalnızca durum güncellenebilir; bakiye bu endpoint üzerinden değiştirilemez.
export class UpdateAccountStatusDto {
  @IsEnum(AccountStatus, {
    message: `status şunlardan biri olmalıdır: ${Object.values(AccountStatus).join(', ')}`,
  })
  status: AccountStatus;
}
