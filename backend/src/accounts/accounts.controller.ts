import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiNotFound,
  ApiProtected,
  ApiUuidParam,
  ApiValidationError,
} from '../common/api-docs';
import { Paginated } from '../common/pagination';
import { AccountResponse, AccountsService } from './accounts.service';
import {
  AccountResponseDto,
  PaginatedAccountResponseDto,
} from './dto/account-response.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import {
  QueryAccountDto,
  QueryCustomerAccountsDto,
} from './dto/query-account.dto';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto';

// Prefix yok: hem /accounts hem de /customers/:id/accounts rotalarını içerir.
// Hesap silme endpoint'i bilinçli olarak yoktur.
@ApiTags('Accounts')
@ApiProtected()
@Controller()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post('accounts')
  @ApiOperation({
    summary: 'Hesap aç',
    description:
      'Hesap numarası otomatik üretilir; bakiye 0, durum ACTIVE olarak başlar.',
  })
  @ApiCreatedResponse({ type: AccountResponseDto })
  @ApiValidationError(
    'Geçersiz customerId veya izin verilmeyen alan (ör. balance)',
  )
  @ApiNotFound('Müşteri bulunamadı')
  create(@Body() dto: CreateAccountDto): Promise<AccountResponse> {
    return this.accountsService.create(dto);
  }

  @Get('accounts')
  @ApiOperation({
    summary: 'Hesapları listele',
    description:
      'Sayfalama, sıralama, hesap numarası araması ve müşteri / durum filtresi destekler.',
  })
  @ApiOkResponse({ type: PaginatedAccountResponseDto })
  @ApiValidationError('Geçersiz sorgu parametresi')
  findAll(
    @Query() query: QueryAccountDto,
  ): Promise<Paginated<AccountResponse>> {
    return this.accountsService.findAll(query);
  }

  @Get('accounts/:id')
  @ApiOperation({ summary: 'Hesap detayı' })
  @ApiUuidParam('Hesap ID')
  @ApiOkResponse({ type: AccountResponseDto })
  @ApiValidationError('Geçersiz UUID')
  @ApiNotFound('Hesap bulunamadı')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AccountResponse> {
    return this.accountsService.findOne(id);
  }

  @Get('customers/:id/accounts')
  @ApiOperation({ summary: 'Müşterinin hesapları' })
  @ApiUuidParam('Müşteri ID')
  @ApiOkResponse({ type: PaginatedAccountResponseDto })
  @ApiValidationError('Geçersiz UUID veya sorgu parametresi')
  @ApiNotFound('Müşteri bulunamadı')
  findAllByCustomer(
    @Param('id', ParseUUIDPipe) customerId: string,
    @Query() query: QueryCustomerAccountsDto,
  ): Promise<Paginated<AccountResponse>> {
    return this.accountsService.findAllByCustomer(customerId, query);
  }

  @Patch('accounts/:id/status')
  @ApiOperation({
    summary: 'Hesap durumunu güncelle',
    description:
      'Yalnızca durum değiştirilebilir; bakiye bu endpoint ile güncellenemez.',
  })
  @ApiUuidParam('Hesap ID')
  @ApiOkResponse({ type: AccountResponseDto })
  @ApiValidationError('Geçersiz UUID, durum veya izin verilmeyen alan')
  @ApiNotFound('Hesap bulunamadı')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountStatusDto,
  ): Promise<AccountResponse> {
    return this.accountsService.updateStatus(id, dto);
  }
}
