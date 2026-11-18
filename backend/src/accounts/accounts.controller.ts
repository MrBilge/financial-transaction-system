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
import { Paginated } from '../common/pagination';
import { AccountResponse, AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import {
  QueryAccountDto,
  QueryCustomerAccountsDto,
} from './dto/query-account.dto';
import { UpdateAccountStatusDto } from './dto/update-account-status.dto';

// Prefix yok: hem /accounts hem de /customers/:id/accounts rotalarını içerir.
@Controller()
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post('accounts')
  create(@Body() dto: CreateAccountDto): Promise<AccountResponse> {
    return this.accountsService.create(dto);
  }

  @Get('accounts')
  findAll(
    @Query() query: QueryAccountDto,
  ): Promise<Paginated<AccountResponse>> {
    return this.accountsService.findAll(query);
  }

  @Get('accounts/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AccountResponse> {
    return this.accountsService.findOne(id);
  }

  @Get('customers/:id/accounts')
  findAllByCustomer(
    @Param('id', ParseUUIDPipe) customerId: string,
    @Query() query: QueryCustomerAccountsDto,
  ): Promise<Paginated<AccountResponse>> {
    return this.accountsService.findAllByCustomer(customerId, query);
  }

  @Patch('accounts/:id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountStatusDto,
  ): Promise<AccountResponse> {
    return this.accountsService.updateStatus(id, dto);
  }
}
