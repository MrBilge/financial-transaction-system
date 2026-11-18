import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsUUID } from 'class-validator';
import { ApiMoneyProperty } from '../../common/api-docs';
import { IsPositiveMoneyAmount } from '../../common/money';

// UUID'ler küçük harfe çevrilir: kilit sırası ve kimlik karşılaştırmaları
// büyük/küçük harf farkından etkilenmesin.
export const toLowerCase = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.toLowerCase() : value;

export const AMOUNT_DOC = {
  description:
    'Sıfırdan büyük, en fazla 16 tam ve 2 ondalık basamaklı tutar (TRY). Hassasiyet kaybı olmaması için string olarak gönderilmelidir.',
  example: '150.75',
};

/** Para yatırma ve para çekme istekleri. */
export class AccountOperationDto {
  @ApiProperty({
    format: 'uuid',
    example: '7b1e4c2a-9d3f-4e5a-8b6c-1d2e3f4a5b6c',
  })
  @Transform(toLowerCase)
  @IsUUID('all', { message: 'accountId geçerli bir UUID olmalıdır' })
  accountId: string;

  @ApiMoneyProperty(AMOUNT_DOC)
  @IsPositiveMoneyAmount()
  amount: string;
}
