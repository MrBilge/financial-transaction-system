import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

// Harflerle başlayıp biten; kelimeler arasında tek boşluk, kesme veya tire
// bulunabilen isimler (ör. "Ayşe", "Mehmet Ali", "O'Neil", "Yılmaz-Kaya").
const NAME_PATTERN = /^\p{L}+(?:[ '-]\p{L}+)*$/u;

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const trimAndLowercase = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CreateCustomerDto {
  @Transform(trim)
  @IsString({ message: 'firstName metin olmalıdır' })
  @IsNotEmpty({ message: 'firstName boş olamaz' })
  @MaxLength(100, { message: 'firstName en fazla 100 karakter olabilir' })
  @Matches(NAME_PATTERN, { message: 'firstName yalnızca harf içermelidir' })
  firstName: string;

  @Transform(trim)
  @IsString({ message: 'lastName metin olmalıdır' })
  @IsNotEmpty({ message: 'lastName boş olamaz' })
  @MaxLength(100, { message: 'lastName en fazla 100 karakter olabilir' })
  @Matches(NAME_PATTERN, { message: 'lastName yalnızca harf içermelidir' })
  lastName: string;

  @Transform(trimAndLowercase)
  @IsEmail({}, { message: 'email geçerli bir e-posta adresi olmalıdır' })
  @MaxLength(255, { message: 'email en fazla 255 karakter olabilir' })
  email: string;
}
