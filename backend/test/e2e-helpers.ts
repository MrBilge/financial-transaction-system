import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { E2E_ADMIN } from './e2e-credentials';

export type TestAgent = ReturnType<typeof request.agent>;

/** Gerçek uygulama yapılandırmasıyla (güvenlik katmanı dahil) test uygulaması. */
export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  await app.init();
  return app;
}

/** POST /auth/login ile gerçek bir erişim token'ı alır. */
export async function loginAsAdmin(
  app: INestApplication<App>,
): Promise<string> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send(E2E_ADMIN)
    .expect(200);
  return (res.body as { accessToken: string }).accessToken;
}

/** Her isteğe "Authorization: Bearer <token>" ekleyen supertest ajanı. */
export async function authorizedAgent(
  app: INestApplication<App>,
): Promise<TestAgent> {
  const token = await loginAsAdmin(app);
  return request
    .agent(app.getHttpServer())
    .set('Authorization', `Bearer ${token}`);
}
