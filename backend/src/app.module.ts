import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AccountsModule } from './accounts/accounts.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { EnvironmentVariables, validateEnv } from './config/env.validation';
import { CustomersModule } from './customers/customers.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { TransactionsModule } from './transactions/transactions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        errorMessage:
          'Çok fazla istek gönderildi, lütfen biraz bekleyip tekrar deneyin',
        throttlers: [
          {
            name: 'default',
            ttl: 60_000,
            limit: config.get('RATE_LIMIT_PER_MINUTE', { infer: true }),
          },
        ],
      }),
    }),
    PrismaModule,
    AuthModule,
    CustomersModule,
    AccountsModule,
    TransactionsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global guard'lar bu sırayla çalışır: önce istek sınırı, sonra JWT.
    // Böylece geçersiz token'larla yapılan istek yağmuru da sınırlanır.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Varsayılan olarak tüm endpoint'ler korunur; açık olanlar @Public() ile işaretlenir.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
