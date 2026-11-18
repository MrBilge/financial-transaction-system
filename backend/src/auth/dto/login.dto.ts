import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin', maxLength: 100 })
  @IsString({ message: 'username metin olmalıdır' })
  @IsNotEmpty({ message: 'username boş olamaz' })
  @MaxLength(100, { message: 'username en fazla 100 karakter olabilir' })
  username: string;

  // bcrypt yalnızca ilk 72 byte'ı kullanır; daha uzun parolalar reddedilir.
  @ApiProperty({ example: 'ChangeMe!2026', maxLength: 72, format: 'password' })
  @IsString({ message: 'password metin olmalıdır' })
  @IsNotEmpty({ message: 'password boş olamaz' })
  @MaxLength(72, { message: 'password en fazla 72 karakter olabilir' })
  password: string;
}
