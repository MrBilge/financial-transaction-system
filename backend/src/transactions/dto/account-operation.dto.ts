import { Transform } from 'class-transformer';
import { IsUUID } from 'class-validator';
import { IsPositiveMoneyAmount } from '../../common/money';

// UUID'ler küçük harfe çevrilir: kilit sırası ve kimlik karşılaştırmaları
// büyük/küçük harf farkından etkilenmesin.
export const toLowerCase = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.toLowerCase() : value;

/** Para yatırma ve para çekme istekleri. */
export class AccountOperationDto {
  @Transform(toLowerCase)
  @IsUUID('all', { message: 'accountId geçerli bir UUID olmalıdır' })
  accountId: string;

  @IsPositiveMoneyAmount()
  amount: string;
}
