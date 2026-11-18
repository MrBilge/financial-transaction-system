import { PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';

// Tüm alanlar opsiyonel; gönderilen alanlar aynı kurallarla doğrulanır.
// @nestjs/swagger'ın PartialType'ı validation ve Swagger metadata'sını birlikte taşır.
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
