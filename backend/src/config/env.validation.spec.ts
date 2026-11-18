import 'reflect-metadata';
import { validateEnv } from './env.validation';

const SECRET = 'a'.repeat(48);
const HASH = '$2b$12$' + 'A'.repeat(53);

const validEnv = {
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  JWT_SECRET: SECRET,
  ADMIN_USERNAME: 'admin',
  ADMIN_PASSWORD_HASH: HASH,
};

describe('validateEnv', () => {
  it('geçerli değerleri kabul eder ve varsayılanları uygular', () => {
    expect(validateEnv(validEnv)).toMatchObject({
      PORT: 3001,
      CORS_ORIGINS: 'http://localhost:3000',
      JWT_EXPIRES_IN_SECONDS: 3600,
      RATE_LIMIT_PER_MINUTE: 100,
    });
  });

  it('string sayıları dönüştürür', () => {
    expect(
      validateEnv({ ...validEnv, JWT_EXPIRES_IN_SECONDS: '900', PORT: '4000' }),
    ).toMatchObject({ JWT_EXPIRES_IN_SECONDS: 900, PORT: 4000 });
  });

  it.each([
    ['kısa JWT_SECRET', { JWT_SECRET: 'kisa' }, 'JWT_SECRET'],
    ['eksik JWT_SECRET', { JWT_SECRET: undefined }, 'JWT_SECRET'],
    [
      'bcrypt olmayan hash',
      { ADMIN_PASSWORD_HASH: 'duz-parola' },
      'ADMIN_PASSWORD_HASH',
    ],
    [
      'çok kısa token süresi',
      { JWT_EXPIRES_IN_SECONDS: '10' },
      'JWT_EXPIRES_IN_SECONDS',
    ],
    ['eksik ADMIN_USERNAME', { ADMIN_USERNAME: undefined }, 'ADMIN_USERNAME'],
  ])('%s için uygulama başlatılmaz', (_label, override, variable) => {
    expect(() => validateEnv({ ...validEnv, ...override })).toThrow(variable);
  });

  it('hata mesajında secret değerlerini göstermez', () => {
    const leakedSecret = 'gizli-ama-kisa';
    let message = '';
    try {
      validateEnv({
        ...validEnv,
        JWT_SECRET: leakedSecret,
        ADMIN_PASSWORD_HASH: 'gizli-hash',
      });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('JWT_SECRET');
    expect(message).not.toContain(leakedSecret);
    expect(message).not.toContain('gizli-hash');
  });
});
