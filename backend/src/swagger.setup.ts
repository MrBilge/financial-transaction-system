import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { BEARER_AUTH } from './common/api-docs';

export const SWAGGER_PATH = 'api/docs';

/** Swagger UI: /api/docs, OpenAPI JSON: /api/docs-json */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Financial Transaction System API')
    .setDescription(
      [
        "Müşteri, hesap ve finansal işlem yönetimi için yönetici API'si.",
        '',
        '**Kimlik doğrulama:** `POST /auth/login` ile token alın, ardından sağ üstteki',
        "**Authorize** butonuna token'ı girin. Login dışındaki tüm endpoint'ler JWT ister.",
        '',
        '**Para birimi:** Tüm tutarlar TRY cinsindendir ve hassasiyet kaybı olmaması için',
        'string olarak gönderilir / döner (ör. `"1250.50"`).',
        '',
        '**İstek sınırı:** IP başına dakikada genel bir sınır ve login için dakikada 5 deneme.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      BEARER_AUTH,
    )
    .addTag('Auth', 'Yönetici girişi ve JWT token')
    .addTag('Customers', 'Müşteri yönetimi')
    .addTag('Accounts', 'Hesap yönetimi')
    .addTag('Transactions', 'Para yatırma, çekme, transfer ve işlem geçmişi')
    .addTag('Reports', 'Özet ve istatistik raporları (Europe/Istanbul)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
