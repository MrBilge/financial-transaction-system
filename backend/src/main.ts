import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { EnvironmentVariables } from './config/env.validation';
import { SWAGGER_PATH } from './swagger.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = app
    .get(ConfigService<EnvironmentVariables, true>)
    .get('PORT', { infer: true });
  await app.listen(port);

  Logger.log(
    `Uygulama ${port} portunda çalışıyor. API dokümantasyonu: /${SWAGGER_PATH}`,
    'Bootstrap',
  );
}

bootstrap().catch((error: unknown) => {
  Logger.error('Uygulama başlatılamadı', error, 'Bootstrap');
  process.exit(1);
});
