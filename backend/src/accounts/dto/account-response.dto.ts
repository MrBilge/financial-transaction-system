import { ApiProperty } from '@nestjs/swagger';
import { AccountStatus } from '@prisma/client';
import { ApiMoneyProperty, PaginatedResponseDto } from '../../common/api-docs';
import { AccountResponse } from '../accounts.service';

/** Swagger yanıt şeması; `implements` ile servisin döndürdüğü tiple uyumu derleme anında denetlenir. */
export class AccountResponseDto implements AccountResponse {
  @ApiProperty({
    format: 'uuid',
    example: '7b1e4c2a-9d3f-4e5a-8b6c-1d2e3f4a5b6c',
  })
  id: string;

  @ApiProperty({
    format: 'uuid',
    example: '3f1c2b8e-5d7a-4c1e-9b2f-1a2b3c4d5e6f',
  })
  customerId: string;

  @ApiProperty({
    example: '4821093756120394',
    description: 'Backend tarafından üretilen 16 haneli benzersiz numara',
  })
  accountNumber: string;

  @ApiMoneyProperty({ description: 'Güncel bakiye (TRY)', example: '1250.50' })
  balance: string;

  @ApiProperty({
    enum: Object.values(AccountStatus),
    enumName: 'AccountStatus',
    example: AccountStatus.ACTIVE,
  })
  status: AccountStatus;

  @ApiProperty({ example: '2026-11-18T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-11-18T10:30:00.000Z' })
  updatedAt: Date;
}

export class PaginatedAccountResponseDto extends PaginatedResponseDto(
  AccountResponseDto,
) {}
