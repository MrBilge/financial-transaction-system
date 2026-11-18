import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiValidationError, ErrorResponseDto } from '../common/api-docs';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { Public } from './public.decorator';

/** Parola deneme saldırılarına karşı login için daha sıkı sınır: IP başına dakikada 5 istek. */
export const LOGIN_RATE_LIMIT = { limit: 5, ttl: 60_000 };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: LOGIN_RATE_LIMIT })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Yönetici girişi',
    description:
      "Başarılı girişte JWT erişim token'ı döner. IP başına dakikada en fazla 5 deneme yapılabilir.",
  })
  @ApiOkResponse({ type: LoginResponseDto, description: 'Giriş başarılı' })
  @ApiValidationError('Kullanıcı adı veya parola eksik / geçersiz formatta')
  @ApiUnauthorizedResponse({
    type: ErrorResponseDto,
    description: 'Kullanıcı adı veya parola hatalı',
  })
  @ApiTooManyRequestsResponse({
    type: ErrorResponseDto,
    description: 'Çok fazla giriş denemesi',
  })
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }
}
