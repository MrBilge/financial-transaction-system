import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';

// PrismaService, global PrismaModule üzerinden enjekte edilir.
@Module({
  controllers: [CustomersController],
  providers: [CustomersService],
  // AccountsModule müşteri varlığını doğrulamak için kullanır.
  exports: [CustomersService],
})
export class CustomersModule {}
