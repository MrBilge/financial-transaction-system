import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { E2E_ADMIN } from './e2e-credentials';
import { createTestApp } from './e2e-helpers';

interface LoginBody {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

interface ErrorBody {
  statusCode: number;
  message: string | string[];
}

const bodyOf = <T>(res: request.Response): T => res.body as T;
const nowInSeconds = () => Math.floor(Date.now() / 1000);

/** Base64url ile imzasız ("alg": "none") JWT. */
const unsignedToken = (payload: object) =>
  [{ alg: 'none', typ: 'JWT' }, payload]
    .map((part) => Buffer.from(JSON.stringify(part)).toString('base64url'))
    .join('.') + '.';

/**
 * Kimlik doğrulama ve güvenlik katmanı (JWT, Helmet, CORS, rate limit)
 * entegrasyon testleri. Hiçbir güvenlik bileşeni devre dışı bırakılmaz.
 */
describe('Auth ve güvenlik (e2e)', () => {
  let app: INestApplication<App>;
  let jwtSecret: string;
  let validToken: string;

  const http = () => request(app.getHttpServer());
  const login = (body: object) => http().post('/auth/login').send(body);

  beforeAll(async () => {
    app = await createTestApp();
    jwtSecret = app.get(ConfigService).getOrThrow<string>('JWT_SECRET');
  });

  afterAll(async () => {
    await app.close();
  });

  // Bu blokta toplam 4 login isteği yapılır (login sınırı: dakikada 5).
  describe('POST /auth/login', () => {
    it('doğru bilgilerle token döner (200)', async () => {
      const res = await login(E2E_ADMIN).expect(200);

      const body = bodyOf<LoginBody>(res);
      expect(body.tokenType).toBe('Bearer');
      expect(body.expiresIn).toBe(3600);

      const payload = new JwtService().decode<{
        sub: string;
        role: string;
        exp: number;
        iat: number;
      }>(body.accessToken);
      expect(payload).toMatchObject({ sub: E2E_ADMIN.username, role: 'admin' });
      expect(payload.exp - payload.iat).toBe(body.expiresIn);
      validToken = body.accessToken;
    });

    it('yanlış parolada 401 döner', async () => {
      const res = await login({
        ...E2E_ADMIN,
        password: 'yanlis-parola',
      }).expect(401);
      expect(bodyOf<ErrorBody>(res).message).toBe(
        'Kullanıcı adı veya parola hatalı',
      );
    });

    it('bilinmeyen kullanıcı adında aynı mesajla 401 döner', async () => {
      const res = await login({ ...E2E_ADMIN, username: 'baskasi' }).expect(
        401,
      );
      expect(bodyOf<ErrorBody>(res).message).toBe(
        'Kullanıcı adı veya parola hatalı',
      );
    });

    it('eksik veya fazla alanlarda 400 döner', async () => {
      const res = await login({ username: '', extra: true }).expect(400);
      expect(bodyOf<ErrorBody>(res).message).toEqual(
        expect.arrayContaining([
          'property extra should not exist',
          'username boş olamaz',
          'password metin olmalıdır',
        ]),
      );
    });
  });

  describe("JWT ile korunan endpoint'ler", () => {
    const protectedRoutes: [string, string][] = [
      ['get', '/customers'],
      ['post', '/customers'],
      ['get', '/accounts'],
      ['patch', '/accounts/7b1e4c2a-9d3f-4e5a-8b6c-1d2e3f4a5b6c/status'],
      ['get', '/transactions'],
      ['post', '/transactions/deposit'],
      ['post', '/transactions/withdraw'],
      ['post', '/transactions/transfer'],
      ['get', '/reports/summary'],
      ['get', '/reports/volume'],
      ['get', '/reports/transaction-stats'],
    ];

    it.each(protectedRoutes)(
      '%s %s token olmadan 401 döner',
      async (method, path) => {
        const res = await (
          http() as unknown as Record<string, (p: string) => request.Test>
        )
          [method](path)
          .expect(401);
        expect(bodyOf<ErrorBody>(res).message).toBe(
          "Geçerli bir erişim token'ı gerekli",
        );
      },
    );

    it('geçerli token ile erişim sağlanır (200)', async () => {
      await http()
        .get('/customers')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);
    });

    it.each([
      ['bozuk token', 'Bearer bu-bir-jwt-degil'],
      ['Bearer öneki olmadan', () => validToken],
      [
        'imzası değiştirilmiş token',
        () => `Bearer ${validToken.slice(0, -2)}xx`,
      ],
      [
        'başka secret ile imzalanmış token',
        () =>
          `Bearer ${new JwtService({ secret: 'x'.repeat(48) }).sign({
            sub: E2E_ADMIN.username,
            role: 'admin',
          })}`,
      ],
      [
        'imzasız (alg: none) token',
        () =>
          `Bearer ${unsignedToken({
            sub: E2E_ADMIN.username,
            role: 'admin',
            exp: nowInSeconds() + 3600,
          })}`,
      ],
    ])('%s reddedilir (401)', async (_label, header) => {
      await http()
        .get('/customers')
        .set('Authorization', typeof header === 'function' ? header() : header)
        .expect(401);
    });

    it('süresi dolmuş token için 401 ve açıklayıcı mesaj döner', async () => {
      const expired = new JwtService({ secret: jwtSecret }).sign({
        sub: E2E_ADMIN.username,
        role: 'admin',
        iat: nowInSeconds() - 120,
        exp: nowInSeconds() - 60,
      });

      const res = await http()
        .get('/customers')
        .set('Authorization', `Bearer ${expired}`)
        .expect(401);
      expect(bodyOf<ErrorBody>(res).message).toBe(
        'Token süresi dolmuş, lütfen tekrar giriş yapın',
      );
    });
  });

  describe('güvenlik başlıkları, CORS ve dokümantasyon', () => {
    it('Helmet başlıklarını ekler ve X-Powered-By göndermez', async () => {
      const res = await http().get('/').expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['content-security-policy']).toContain(
        "default-src 'self'",
      );
      expect(res.headers['strict-transport-security']).toBeDefined();
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('rate limit başlıklarını ekler', async () => {
      const res = await http().get('/').expect(200);
      expect(res.headers['x-ratelimit-limit']).toBeDefined();
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    });

    it("CORS yalnızca izinli origin'e izin verir", async () => {
      const preflight = (origin: string) =>
        http()
          .options('/customers')
          .set('Origin', origin)
          .set('Access-Control-Request-Method', 'GET')
          .set('Access-Control-Request-Headers', 'authorization');

      const allowed = await preflight('http://localhost:3000').expect(204);
      expect(allowed.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000',
      );
      expect(allowed.headers['access-control-allow-headers']).toContain(
        'Authorization',
      );

      const denied = await preflight('https://evil.example.com');
      expect(denied.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('Swagger UI ve OpenAPI dokümanı herkese açıktır', async () => {
      const ui = await http().get('/api/docs').redirects(1).expect(200);
      expect(ui.headers['content-type']).toContain('text/html');

      const res = await http().get('/api/docs-json').expect(200);
      const doc = res.body as {
        tags: { name: string }[];
        components: { securitySchemes: Record<string, { scheme: string }> };
        paths: Record<string, unknown>;
      };
      expect(doc.tags.map((t) => t.name)).toEqual([
        'Auth',
        'Customers',
        'Accounts',
        'Transactions',
        'Reports',
      ]);
      expect(doc.components.securitySchemes.bearer.scheme).toBe('bearer');
      expect(Object.keys(doc.paths)).toEqual(
        expect.arrayContaining([
          '/auth/login',
          '/customers',
          '/accounts/{id}/status',
          '/transactions/transfer',
          '/reports/transaction-stats',
        ]),
      );
    });
  });

  describe('login istek sınırı', () => {
    // Sayaç uygulama örneğine özgü olduğundan bu senaryo yeni bir örnekte çalışır.
    let limitedApp: INestApplication<App>;

    beforeAll(async () => {
      limitedApp = await createTestApp();
    });

    afterAll(async () => {
      await limitedApp.close();
    });

    it('dakikada 5 denemeden sonra 429 döner (doğru parola ile bile)', async () => {
      const attempt = (password: string) =>
        request(limitedApp.getHttpServer())
          .post('/auth/login')
          .send({ username: E2E_ADMIN.username, password });

      for (let i = 0; i < 5; i++) {
        await attempt('yanlis-parola').expect(401);
      }
      const res = await attempt(E2E_ADMIN.password).expect(429);
      expect(bodyOf<ErrorBody>(res).message).toBe(
        'Çok fazla istek gönderildi, lütfen biraz bekleyip tekrar deneyin',
      );
      expect(res.headers['retry-after']).toBeDefined();
    });
  });
});
