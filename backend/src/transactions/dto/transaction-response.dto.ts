import { ApiProperty } from '@nestjs/swagger';
import { TransactionStatus, TransactionType } from '@prisma/client';
import { ApiMoneyProperty, PaginatedResponseDto } from '../../common/api-docs';
import { TransactionResponse } from '../transactions.service';

/** Swagger yanıt şeması; `implements` ile servisin döndürdüğü tiple uyumu derleme anında denetlenir. */
export class TransactionResponseDto implements TransactionResponse {
  @ApiProperty({
    format: 'uuid',
    example: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
  })
  id: string;

  @ApiProperty({ example: 'TRX-20261118-9F3A1C7B2E4D' })
  transactionNumber: string;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    type: String,
    description: 'WITHDRAWAL ve TRANSFER için dolu, DEPOSIT için null',
    example: '7b1e4c2a-9d3f-4e5a-8b6c-1d2e3f4a5b6c',
  })
  sourceAccountId: string | null;

  @ApiProperty({
    format: 'uuid',
    nullable: true,
    type: String,
    description: 'DEPOSIT ve TRANSFER için dolu, WITHDRAWAL için null',
    example: 'c4d5e6f7-1a2b-4c3d-8e9f-0a1b2c3d4e5f',
  })
  targetAccountId: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Kaynak hesap numarası (DEPOSIT için null)',
    example: '4821093756120394',
  })
  sourceAccountNumber: string | null;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Hedef hesap numarası (WITHDRAWAL için null)',
    example: '6179894025555092',
  })
  targetAccountNumber: string | null;

  @ApiMoneyProperty({ description: 'İşlem tutarı (TRY)', example: '150.75' })
  amount: string;

  @ApiProperty({
    enum: Object.values(TransactionType),
    enumName: 'TransactionType',
    example: TransactionType.TRANSFER,
  })
  type: TransactionType;

  @ApiProperty({
    enum: Object.values(TransactionStatus),
    enumName: 'TransactionStatus',
    example: TransactionStatus.SUCCESS,
  })
  status: TransactionStatus;

  @ApiProperty({
    nullable: true,
    type: String,
    description: 'Yalnızca FAILED işlemlerde dolu',
    example: null,
  })
  failureReason: string | null;

  @ApiProperty({ example: '2026-11-18T10:30:00.000Z' })
  createdAt: Date;
}

export class PaginatedTransactionResponseDto extends PaginatedResponseDto(
  TransactionResponseDto,
) {}

/** İş kuralı ihlali (422): işlem FAILED olarak kaydedilir ve kayıt yanıtta döner. */
export class RejectedTransactionResponseDto {
  @ApiProperty({ example: 422 })
  statusCode: number;

  @ApiProperty({ example: 'Unprocessable Entity' })
  error: string;

  @ApiProperty({
    example: 'Yetersiz bakiye',
    description:
      'Ret nedeni: "Yetersiz bakiye", "Kaynak hesap aktif değil" veya "Hedef hesap aktif değil"',
  })
  message: string;

  @ApiProperty({
    type: TransactionResponseDto,
    description: 'FAILED olarak kaydedilen işlem',
  })
  transaction: TransactionResponseDto;
}
