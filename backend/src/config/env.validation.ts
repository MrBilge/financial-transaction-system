import { plainToInstance, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

// bcrypt hash formatı: $2a$/$2b$/$2y$ + maliyet + 53 karakter salt ve hash.
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/**
 * Uygulamanın ihtiyaç duyduğu ortam değişkenleri. Eksik veya hatalı bir değer
 * varsa uygulama başlarken hata verir (fail fast); güvenlik ayarları
 * sessizce varsayılan değerlere düşmez.
 */
export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  PORT: number = 3001;

  /** Virgülle ayrılmış izinli origin listesi. */
  @IsOptional()
  @IsString()
  CORS_ORIGINS: string = 'http://localhost:3000';

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET en az 32 karakter olmalıdır' })
  JWT_SECRET: string;

  /** Token geçerlilik süresi (saniye). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(86_400)
  JWT_EXPIRES_IN_SECONDS: number = 3600;

  @IsString()
  @IsNotEmpty()
  ADMIN_USERNAME: string;

  @Matches(BCRYPT_HASH, {
    message: 'ADMIN_PASSWORD_HASH geçerli bir bcrypt hash olmalıdır',
  })
  ADMIN_PASSWORD_HASH: string;

  /** Bir IP'nin dakikada yapabileceği istek sayısı (login için ayrıca daha sıkı sınır vardır). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  RATE_LIMIT_PER_MINUTE: number = 100;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const env = plainToInstance(EnvironmentVariables, config);
  const errors = validateSync(env, { skipMissingProperties: false });
  if (errors.length > 0) {
    // Yalnızca değişken adları ve kurallar yazılır; değerler (secret'lar) loglanmaz.
    const details = errors
      .map(
        (e) =>
          `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`,
      )
      .join('; ');
    throw new Error(`Geçersiz ortam değişkenleri -> ${details}`);
  }
  return env;
}
