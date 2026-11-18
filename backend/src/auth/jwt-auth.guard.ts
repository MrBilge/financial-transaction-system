import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

/** Global guard: @Public() ile işaretlenmemiş her endpoint geçerli bir JWT ister. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic || super.canActivate(context);
  }

  handleRequest<TUser>(
    err: unknown,
    user: TUser | false,
    info: unknown,
  ): TUser {
    if (err || !user) {
      throw new UnauthorizedException(
        // passport-jwt süresi dolmuş token için jsonwebtoken'ın TokenExpiredError'ını iletir.
        info instanceof Error && info.name === 'TokenExpiredError'
          ? 'Token süresi dolmuş, lütfen tekrar giriş yapın'
          : "Geçerli bir erişim token'ı gerekli",
      );
    }
    return user;
  }
}
