import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { hashSync } from 'bcryptjs';
import { AuthService } from './auth.service';

const PASSWORD = 'Dogru-Parola!1';
const env: Record<string, unknown> = {
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD_HASH: hashSync(PASSWORD, 4),
  JWT_EXPIRES_IN_SECONDS: 900,
};

describe('AuthService', () => {
  let service: AuthService;
  const jwtService = { signAsync: jest.fn().mockResolvedValue('signed.jwt') };
  let warn: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => env[key] },
        },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('doğru bilgilerle token üretir', async () => {
    const result = await service.login({
      username: 'admin',
      password: PASSWORD,
    });

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'admin',
      role: 'admin',
    });
    expect(result).toEqual({
      accessToken: 'signed.jwt',
      tokenType: 'Bearer',
      expiresIn: 900,
    });
  });

  it.each([
    ['yanlış parola', { username: 'admin', password: 'yanlis' }],
    ['yanlış kullanıcı adı', { username: 'root', password: PASSWORD }],
    ['büyük/küçük harf farkı', { username: 'Admin', password: PASSWORD }],
  ])('%s için 401 fırlatır ve token üretmez', async (_label, dto) => {
    await expect(service.login(dto)).rejects.toThrow(
      new UnauthorizedException('Kullanıcı adı veya parola hatalı'),
    );
    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });

  it('başarısız denemede girilen bilgileri loglamaz', async () => {
    await service
      .login({ username: 'gizli-kullanici', password: 'gizli-parola' })
      .catch(() => undefined);

    const logged = JSON.stringify(warn.mock.calls);
    expect(warn).toHaveBeenCalled();
    expect(logged).not.toContain('gizli-kullanici');
    expect(logged).not.toContain('gizli-parola');
  });
});
