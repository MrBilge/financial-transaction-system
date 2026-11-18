import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

// PrismaService, global PrismaModule üzerinden enjekte edilir.
@Module({
  imports: [AccountsModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
