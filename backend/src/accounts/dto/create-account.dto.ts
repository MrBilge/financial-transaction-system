import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

// Hesap numarası, bakiye ve durum backend tarafından belirlenir;
// bu alanlar gönderilirse global ValidationPipe isteği 400 ile reddeder.
export class CreateAccountDto {
  @ApiProperty({
    format: 'uuid',
    example: '3f1c2b8e-5d7a-4c1e-9b2f-1a2b3c4d5e6f',
    description:
      'Hesabın açılacağı müşteri. Hesap numarası, bakiye (0) ve durum (ACTIVE) otomatik belirlenir.',
  })
  @IsUUID('all', { message: 'customerId geçerli bir UUID olmalıdır' })
  customerId: string;
}
