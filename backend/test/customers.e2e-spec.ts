import { randomBytes, randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

interface CustomerBody {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface CustomerListBody {
  data: CustomerBody[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

interface ErrorBody {
  message: string | string[];
}

// supertest yanıt gövdesini `any` olarak döndürür; testlerde tipli okumak için.
const bodyOf = <T>(res: request.Response): T => res.body as T;
const firstNames = (res: request.Response) =>
  bodyOf<CustomerListBody>(res).data.map((c) => c.firstName);

/**
 * Customers API entegrasyon testleri. Gerçek PostgreSQL veritabanı kullanır;
 * oluşturduğu kayıtları benzersiz bir etiketle işaretler ve sonunda siler.
 */
describe('Customers API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Yalnızca harflerden oluşan, bu test çalıştırmasına özgü etiket.
  const tag = Array.from(randomBytes(8), (b) =>
    String.fromCharCode(97 + (b % 26)),
  ).join('');
  const email = (name: string) => `${name}.${tag}@example.com`;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.customer.deleteMany({ where: { email: { contains: tag } } });
    await app.close();
  });

  const createCustomer = (body: object) =>
    request(app.getHttpServer()).post('/customers').send(body);

  describe('POST /customers', () => {
    it('müşteri oluşturur ve alanları normalize eder (201)', async () => {
      const res = await createCustomer({
        firstName: '  Ayşe ',
        lastName: 'Yılmaz',
        email: `  ${email('AYSE').toUpperCase()} `,
      }).expect(201);

      const body = bodyOf<CustomerBody>(res);
      expect(body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(body).toMatchObject({
        firstName: 'Ayşe',
        lastName: 'Yılmaz',
        email: email('ayse'),
      });
    });

    it('tekrarlanan e-postada 409 döndürür', async () => {
      const res = await createCustomer({
        firstName: 'Başka',
        lastName: 'Kişi',
        email: email('Ayse'),
      }).expect(409);

      expect(bodyOf<ErrorBody>(res).message).toBe(
        'Bu e-posta adresi zaten kullanılıyor',
      );
    });

    it('geçersiz alanlarda 400 döndürür', async () => {
      const res = await createCustomer({
        firstName: '',
        lastName: 'Kaya1',
        email: 'gecersiz',
      }).expect(400);

      expect(bodyOf<ErrorBody>(res).message).toEqual(
        expect.arrayContaining([
          'firstName boş olamaz',
          'lastName yalnızca harf içermelidir',
          'email geçerli bir e-posta adresi olmalıdır',
        ]),
      );
    });

    it('tanımsız alanlarda 400 döndürür', async () => {
      await createCustomer({
        firstName: 'Ali',
        lastName: 'Kaya',
        email: email('ali'),
        isAdmin: true,
      }).expect(400);
    });
  });

  describe('GET /customers/:id', () => {
    it('müşteriyi döndürür (200)', async () => {
      const created = await createCustomer({
        firstName: 'Can',
        lastName: 'Demir',
        email: email('can'),
      }).expect(201);

      const res = await request(app.getHttpServer())
        .get(`/customers/${bodyOf<CustomerBody>(created).id}`)
        .expect(200);
      expect(res.body).toEqual(created.body);
    });

    it('bulunamayan müşteri için 404 döndürür', async () => {
      await request(app.getHttpServer())
        .get(`/customers/${randomUUID()}`)
        .expect(404);
    });

    it('geçersiz UUID için 400 döndürür', async () => {
      await request(app.getHttpServer())
        .get('/customers/not-a-uuid')
        .expect(400);
    });
  });

  describe('PATCH /customers/:id', () => {
    let id: string;

    beforeAll(async () => {
      const res = await createCustomer({
        firstName: 'Elif',
        lastName: 'Şahin',
        email: email('elif'),
      });
      id = bodyOf<CustomerBody>(res).id;
    });

    it('gönderilen alanları günceller (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/customers/${id}`)
        .send({ lastName: 'Aydın' })
        .expect(200);

      expect(res.body).toMatchObject({
        firstName: 'Elif',
        lastName: 'Aydın',
        email: email('elif'),
      });
    });

    it('başka müşteriye ait e-postada 409 döndürür', async () => {
      await request(app.getHttpServer())
        .patch(`/customers/${id}`)
        .send({ email: email('ayse') })
        .expect(409);
    });

    it('geçersiz alanda 400 döndürür', async () => {
      await request(app.getHttpServer())
        .patch(`/customers/${id}`)
        .send({ email: 'gecersiz' })
        .expect(400);
    });

    it('bulunamayan müşteri için 404 döndürür', async () => {
      await request(app.getHttpServer())
        .patch(`/customers/${randomUUID()}`)
        .send({ lastName: 'Aydın' })
        .expect(404);
    });

    it('geçersiz UUID için 400 döndürür', async () => {
      await request(app.getHttpServer())
        .patch('/customers/123')
        .send({ lastName: 'Aydın' })
        .expect(400);
    });
  });

  describe('GET /customers', () => {
    const lastName = `Liste${tag}`;

    beforeAll(async () => {
      for (const firstName of ['Zeynep', 'Burak', 'Merve']) {
        await createCustomer({
          firstName,
          lastName,
          email: email(`liste-${firstName.toLowerCase()}`),
        }).expect(201);
      }
    });

    it('büyük/küçük harf duyarsız arar, sıralar ve sayfalar', async () => {
      const res = await request(app.getHttpServer())
        .get('/customers')
        .query({
          search: lastName.toUpperCase(),
          sortBy: 'firstName',
          sortOrder: 'asc',
          limit: 2,
          page: 1,
        })
        .expect(200);

      expect(firstNames(res)).toEqual(['Burak', 'Merve']);
      expect(bodyOf<CustomerListBody>(res).meta).toEqual({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });

      const page2 = await request(app.getHttpServer())
        .get('/customers')
        .query({
          search: lastName,
          sortBy: 'firstName',
          limit: 2,
          page: 2,
          sortOrder: 'asc',
        })
        .expect(200);
      expect(firstNames(page2)).toEqual(['Zeynep']);
    });

    it('e-posta üzerinden arar', async () => {
      const res = await request(app.getHttpServer())
        .get('/customers')
        .query({ search: `liste-merve.${tag}` })
        .expect(200);

      expect(bodyOf<CustomerListBody>(res).meta.total).toBe(1);
      expect(firstNames(res)).toEqual(['Merve']);
    });

    it('geçersiz sorgu parametrelerinde 400 döndürür', async () => {
      await request(app.getHttpServer())
        .get('/customers')
        .query({ page: 0, limit: 500, sortBy: 'password' })
        .expect(400);
    });
  });
});
