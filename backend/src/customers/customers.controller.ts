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
import { Customer } from '@prisma/client';
import {
  ApiConflict,
  ApiNotFound,
  ApiProtected,
  ApiUuidParam,
  ApiValidationError,
} from '../common/api-docs';
import { Paginated } from '../common/pagination';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import {
  CustomerResponseDto,
  PaginatedCustomerResponseDto,
} from './dto/customer-response.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@ApiTags('Customers')
@ApiProtected()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Müşteri oluştur' })
  @ApiCreatedResponse({ type: CustomerResponseDto })
  @ApiValidationError('Geçersiz ad, soyad veya e-posta')
  @ApiConflict('Bu e-posta adresi zaten kullanılıyor')
  create(@Body() dto: CreateCustomerDto): Promise<Customer> {
    return this.customersService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Müşterileri listele',
    description:
      'Sayfalama, sıralama ve ad / soyad / e-posta araması destekler.',
  })
  @ApiOkResponse({ type: PaginatedCustomerResponseDto })
  @ApiValidationError('Geçersiz sorgu parametresi')
  findAll(@Query() query: QueryCustomerDto): Promise<Paginated<Customer>> {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Müşteri detayı' })
  @ApiUuidParam('Müşteri ID')
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiValidationError('Geçersiz UUID')
  @ApiNotFound('Müşteri bulunamadı')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Customer> {
    return this.customersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Müşteri bilgilerini güncelle',
    description: 'Yalnızca gönderilen alanlar güncellenir.',
  })
  @ApiUuidParam('Müşteri ID')
  @ApiOkResponse({ type: CustomerResponseDto })
  @ApiValidationError('Geçersiz UUID veya alan')
  @ApiNotFound('Müşteri bulunamadı')
  @ApiConflict('Bu e-posta adresi zaten kullanılıyor')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<Customer> {
    return this.customersService.update(id, dto);
  }
}
