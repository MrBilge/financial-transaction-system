import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { createHash, timingSafeEqual } from 'node:crypto';
import { EnvironmentVariables } from '../config/env.validation';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtPayload } from './jwt.strategy';

const INVALID_CREDENTIALS = 'Kullanıcı adı veya parola hatalı';

/**
 * Tek bir demo yönetici hesabı ile kimlik doğrulama. Kullanıcı tablosu yoktur;
 * kullanıcı adı ve bcrypt parola hash'i ortam değişkenlerinden okunur.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async login({ username, password }: LoginDto): Promise<LoginResponseDto> {
    const adminUsername = this.config.get('ADMIN_USERNAME', { infer: true });
    const passwordHash = this.config.get('ADMIN_PASSWORD_HASH', {
      infer: true,
    });

    // Parola, kullanıcı adı yanlış olsa da karşılaştırılır: yanıt süresi
    // kullanıcı adının doğru olup olmadığını ele vermez.
    const passwordMatches = await compare(password, passwordHash);
    if (!safeEqual(username, adminUsername) || !passwordMatches) {
      // Girilen kullanıcı adı / parola loglanmaz.
      this.logger.warn('Başarısız giriş denemesi');
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const payload: JwtPayload = { sub: adminUsername, role: 'admin' };
    const accessToken = await this.jwtService.signAsync(payload);
    this.logger.log(`Yönetici girişi başarılı: ${adminUsername}`);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.config.get('JWT_EXPIRES_IN_SECONDS', { infer: true }),
    };
  }
}

/** Sabit sürede karşılaştırma (uzunluk farkı da sızdırılmaz). */
function safeEqual(a: string, b: string): boolean {
  const digest = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}
