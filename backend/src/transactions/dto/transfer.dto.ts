import { Transform } from 'class-transformer';
import { IsUUID } from 'class-validator';
import { IsPositiveMoneyAmount } from '../../common/money';
import { toLowerCase } from './account-operation.dto';

export class TransferDto {
  @Transform(toLowerCase)
  @IsUUID('all', { message: 'sourceAccountId geçerli bir UUID olmalıdır' })
  sourceAccountId: string;

  @Transform(toLowerCase)
  @IsUUID('all', { message: 'targetAccountId geçerli bir UUID olmalıdır' })
  targetAccountId: string;

  @IsPositiveMoneyAmount()
  amount: string;
}
