import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { EnvironmentVariables } from './config/env.validation';
import { setupSwagger } from './swagger.setup';

/**
 * Uygulama genelindeki ayarlar. main.ts ve e2e testleri aynı yapılandırmayı
 * (güvenlik katmanı dahil) kullansın diye tek yerde tutulur.
 */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService<EnvironmentVariables, true>);

  // Güvenlik başlıkları (CSP, HSTS, X-Content-Type-Options, X-Frame-Options...).
  // Swagger UI, script ve stillerini harici dosyalardan yüklediği için varsayılan CSP ile uyumludur.
  app.use(helmet());

  // Kimlik doğrulama Bearer token ile yapılır (cookie yok), bu yüzden credentials kapalıdır.
  app.enableCors({
    origin: config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    methods: ['GET', 'POST', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,
    maxAge: 600,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      // DTO'da tanımlı olmayan alanları reddeder.
      whitelist: true,
      forbidNonWhitelisted: true,
      // Gelen veriyi DTO sınıfına dönüştürür (ör. query string -> number).
      transform: true,
    }),
  );

  setupSwagger(app);
}
