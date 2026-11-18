import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;

  it("@Public() endpoint'lerde token istemez", () => {
    const reflector = { getAllAndOverride: () => true } as unknown as Reflector;
    expect(new JwtAuthGuard(reflector).canActivate(context)).toBe(true);
  });

  describe('handleRequest', () => {
    const guard = new JwtAuthGuard(new Reflector());

    it('doğrulanan kullanıcıyı döndürür', () => {
      const user = { username: 'admin', role: 'admin' };
      expect(guard.handleRequest(null, user, undefined)).toBe(user);
    });

    it('token yoksa veya geçersizse 401 fırlatır', () => {
      expect(() =>
        guard.handleRequest(null, false, new Error('No auth token')),
      ).toThrow(
        new UnauthorizedException("Geçerli bir erişim token'ı gerekli"),
      );
    });

    it('süresi dolmuş token için açıklayıcı mesaj verir', () => {
      const expired = Object.assign(new Error('jwt expired'), {
        name: 'TokenExpiredError',
      });
      expect(() => guard.handleRequest(null, false, expired)).toThrow(
        new UnauthorizedException(
          'Token süresi dolmuş, lütfen tekrar giriş yapın',
        ),
      );
    });
  });
});
