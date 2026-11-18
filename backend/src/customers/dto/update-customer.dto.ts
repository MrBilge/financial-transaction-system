import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerDto } from './create-customer.dto';

// Tüm alanlar opsiyonel; gönderilen alanlar aynı kurallarla doğrulanır.
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
