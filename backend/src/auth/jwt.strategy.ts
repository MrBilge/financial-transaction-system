import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { EnvironmentVariables } from '../config/env.validation';

export interface JwtPayload {
  sub: string;
  role: 'admin';
}

export interface AuthenticatedAdmin {
  username: string;
  role: 'admin';
}

/** Authorization: Bearer <token> başlığındaki JWT'yi doğrular (imza + süre). */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService<EnvironmentVariables, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
      algorithms: ['HS256'],
    });
  }

  validate(payload: JwtPayload): AuthenticatedAdmin {
    return { username: payload.sub, role: payload.role };
  }
}
