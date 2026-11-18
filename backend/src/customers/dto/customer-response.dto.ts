import { ApiProperty } from '@nestjs/swagger';
import { Customer } from '@prisma/client';
import { PaginatedResponseDto } from '../../common/api-docs';

/** Swagger yanıt şeması; `implements` ile servisin döndürdüğü tiple uyumu derleme anında denetlenir. */
export class CustomerResponseDto implements Customer {
  @ApiProperty({
    format: 'uuid',
    example: '3f1c2b8e-5d7a-4c1e-9b2f-1a2b3c4d5e6f',
  })
  id: string;

  @ApiProperty({ example: 'Ayşe' })
  firstName: string;

  @ApiProperty({ example: 'Yılmaz' })
  lastName: string;

  @ApiProperty({ example: 'ayse.yilmaz@example.com', format: 'email' })
  email: string;

  @ApiProperty({ example: '2026-11-18T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-11-18T10:30:00.000Z' })
  updatedAt: Date;
}

export class PaginatedCustomerResponseDto extends PaginatedResponseDto(
  CustomerResponseDto,
) {}
