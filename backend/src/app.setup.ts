import { INestApplication, ValidationPipe } from '@nestjs/common';

/**
 * Uygulama genelindeki ayarlar. main.ts ve e2e testleri aynı yapılandırmayı
 * kullansın diye tek yerde tutulur.
 */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      // DTO'da tanımlı olmayan alanları reddeder.
      whitelist: true,
      forbidNonWhitelisted: true,
      // Gelen veriyi DTO sınıfına dönüştürür (ör. query string -> number).
      transform: true,
    }),
  );
}
