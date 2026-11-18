import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { Paginated } from '../common/pagination';
import { AccountOperationDto } from './dto/account-operation.dto';
import {
  QueryAccountTransactionsDto,
  QueryTransactionDto,
} from './dto/query-transaction.dto';
import { TransferDto } from './dto/transfer.dto';
import {
  TransactionResponse,
  TransactionsService,
} from './transactions.service';

// Prefix yok: hem /transactions hem de /accounts/:id/transactions rotalarını içerir.
// İşlem geçmişi değiştirilemez: güncelleme veya silme endpoint'i bilinçli olarak yoktur.
@Controller()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('transactions/deposit')
  deposit(@Body() dto: AccountOperationDto): Promise<TransactionResponse> {
    return this.transactionsService.deposit(dto);
  }

  @Post('transactions/withdraw')
  withdraw(@Body() dto: AccountOperationDto): Promise<TransactionResponse> {
    return this.transactionsService.withdraw(dto);
  }

  @Post('transactions/transfer')
  transfer(@Body() dto: TransferDto): Promise<TransactionResponse> {
    return this.transactionsService.transfer(dto);
  }

  @Get('transactions')
  findAll(
    @Query() query: QueryTransactionDto,
  ): Promise<Paginated<TransactionResponse>> {
    return this.transactionsService.findAll(query);
  }

  @Get('transactions/:id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransactionResponse> {
    return this.transactionsService.findOne(id);
  }

  @Get('accounts/:id/transactions')
  findAllByAccount(
    @Param('id', ParseUUIDPipe) accountId: string,
    @Query() query: QueryAccountTransactionsDto,
  ): Promise<Paginated<TransactionResponse>> {
    return this.transactionsService.findAllByAccount(accountId, query);
  }
}
