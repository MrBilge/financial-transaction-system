import {
  applyDecorators,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import {
  ApiNotFound,
  ApiProtected,
  ApiUuidParam,
  ApiValidationError,
  ErrorResponseDto,
} from '../common/api-docs';
import { Paginated } from '../common/pagination';
import { AccountOperationDto } from './dto/account-operation.dto';
import {
  QueryAccountTransactionsDto,
  QueryTransactionDto,
} from './dto/query-transaction.dto';
import {
  PaginatedTransactionResponseDto,
  RejectedTransactionResponseDto,
  TransactionResponseDto,
} from './dto/transaction-response.dto';
import { TransferDto } from './dto/transfer.dto';
import {
  TransactionResponse,
  TransactionsService,
} from './transactions.service';

/** Para hareketi endpoint'lerinin ortak yanıtları. */
const ApiMoneyMovementResponses = (rejectionReasons: string) =>
  applyDecorators(
    ApiCreatedResponse({
      type: TransactionResponseDto,
      description: 'İşlem başarılı (status: SUCCESS)',
    }),
    ApiValidationError(
      "Geçersiz UUID veya tutar (ör. sıfır, negatif, 2'den fazla ondalık, number tipi)",
    ),
    ApiNotFound('Hesap bulunamadı (kayıt oluşturulmaz)'),
    ApiUnprocessableEntityResponse({
      type: RejectedTransactionResponseDto,
      description: `İş kuralı ihlali; işlem FAILED olarak kaydedilir. Nedenler: ${rejectionReasons}`,
    }),
    ApiInternalServerErrorResponse({
      type: ErrorResponseDto,
      description:
        'Beklenmeyen hata; tüm bakiye değişiklikleri geri alınır, işlem FAILED olarak kaydedilir',
    }),
  );

// Prefix yok: hem /transactions hem de /accounts/:id/transactions rotalarını içerir.
// İşlem geçmişi değiştirilemez: güncelleme veya silme endpoint'i bilinçli olarak yoktur.
@ApiTags('Transactions')
@ApiProtected()
@Controller()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('transactions/deposit')
  @ApiOperation({ summary: 'Para yatır' })
  @ApiMoneyMovementResponses('Hedef hesap aktif değil')
  deposit(@Body() dto: AccountOperationDto): Promise<TransactionResponse> {
    return this.transactionsService.deposit(dto);
  }

  @Post('transactions/withdraw')
  @ApiOperation({ summary: 'Para çek' })
  @ApiMoneyMovementResponses('Kaynak hesap aktif değil, Yetersiz bakiye')
  withdraw(@Body() dto: AccountOperationDto): Promise<TransactionResponse> {
    return this.transactionsService.withdraw(dto);
  }

  @Post('transactions/transfer')
  @ApiOperation({
    summary: 'Hesaplar arası transfer',
    description:
      "Kaynak ve hedef hesap aynı veritabanı transaction'ı içinde, sabit sırayla kilitlenerek güncellenir. Aynı hesaba transfer 400 döner.",
  })
  @ApiMoneyMovementResponses(
    'Kaynak hesap aktif değil, Hedef hesap aktif değil, Yetersiz bakiye',
  )
  transfer(@Body() dto: TransferDto): Promise<TransactionResponse> {
    return this.transactionsService.transfer(dto);
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'İşlemleri listele',
    description:
      'Sayfalama, sıralama, işlem numarası araması ve hesap / tür / durum / tarih / tutar filtreleri destekler.',
  })
  @ApiOkResponse({ type: PaginatedTransactionResponseDto })
  @ApiValidationError(
    'Geçersiz sorgu parametresi veya aralık (startDate > endDate, minAmount > maxAmount)',
  )
  findAll(
    @Query() query: QueryTransactionDto,
  ): Promise<Paginated<TransactionResponse>> {
    return this.transactionsService.findAll(query);
  }

  @Get('transactions/:id')
  @ApiOperation({ summary: 'İşlem detayı' })
  @ApiUuidParam('İşlem ID')
  @ApiOkResponse({ type: TransactionResponseDto })
  @ApiValidationError('Geçersiz UUID')
  @ApiNotFound('İşlem bulunamadı')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransactionResponse> {
    return this.transactionsService.findOne(id);
  }

  @Get('accounts/:id/transactions')
  @ApiOperation({
    summary: 'Hesabın işlem geçmişi',
    description: 'Hesabın kaynak veya hedef olduğu tüm işlemler.',
  })
  @ApiUuidParam('Hesap ID')
  @ApiOkResponse({ type: PaginatedTransactionResponseDto })
  @ApiValidationError('Geçersiz UUID veya sorgu parametresi')
  @ApiNotFound('Hesap bulunamadı')
  findAllByAccount(
    @Param('id', ParseUUIDPipe) accountId: string,
    @Query() query: QueryAccountTransactionsDto,
  ): Promise<Paginated<TransactionResponse>> {
    return this.transactionsService.findAllByAccount(accountId, query);
  }
}
