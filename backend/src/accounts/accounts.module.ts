import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

// PrismaService, global PrismaModule üzerinden enjekte edilir.
@Module({
  imports: [CustomersModule],
  controllers: [AccountsController],
  providers: [AccountsService],
  // TransactionsModule hesap varlığını doğrulamak için kullanır.
  exports: [AccountsService],
})
export class AccountsModule {}
