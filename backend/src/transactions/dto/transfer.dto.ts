import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsUUID } from 'class-validator';
import { ApiMoneyProperty } from '../../common/api-docs';
import { IsPositiveMoneyAmount } from '../../common/money';
import { AMOUNT_DOC, toLowerCase } from './account-operation.dto';

export class TransferDto {
  @ApiProperty({
    format: 'uuid',
    example: '7b1e4c2a-9d3f-4e5a-8b6c-1d2e3f4a5b6c',
    description: 'Paranın çekileceği hesap',
  })
  @Transform(toLowerCase)
  @IsUUID('all', { message: 'sourceAccountId geçerli bir UUID olmalıdır' })
  sourceAccountId: string;

  @ApiProperty({
    format: 'uuid',
    example: 'c4d5e6f7-1a2b-4c3d-8e9f-0a1b2c3d4e5f',
    description:
      'Paranın yatırılacağı hesap (kaynak hesaptan farklı olmalıdır)',
  })
  @Transform(toLowerCase)
  @IsUUID('all', { message: 'targetAccountId geçerli bir UUID olmalıdır' })
  targetAccountId: string;

  @ApiMoneyProperty(AMOUNT_DOC)
  @IsPositiveMoneyAmount()
  amount: string;
}
