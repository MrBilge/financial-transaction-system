import { IsUUID } from 'class-validator';

// Hesap numarası, bakiye ve durum backend tarafından belirlenir;
// bu alanlar gönderilirse global ValidationPipe isteği 400 ile reddeder.
export class CreateAccountDto {
  @IsUUID('all', { message: 'customerId geçerli bir UUID olmalıdır' })
  customerId: string;
}
