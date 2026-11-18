import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

/** Swagger şemasındaki JWT güvenlik şemasının adı. */
export const BEARER_AUTH = 'bearer';

const MONEY_PATTERN = '^\\d{1,16}(\\.\\d{1,2})?$';

interface MoneyDocOptions {
  description?: string;
  example?: string;
  required?: boolean;
}

/** TRY tutarı: hassasiyet kaybı olmaması için string olarak taşınır. */
export const ApiMoneyProperty = ({
  description = 'TRY tutarı (string, en fazla 2 ondalık basamak)',
  example = '1250.50',
  required = true,
}: MoneyDocOptions = {}) =>
  (required ? ApiProperty : ApiPropertyOptional)({
    type: String,
    pattern: MONEY_PATTERN,
    description,
    example,
  });

/** UUID path parametresi. */
export const ApiUuidParam = (description: string, name = 'id') =>
  ApiParam({ name, format: 'uuid', description });

/** NestJS'in standart hata yanıtı. */
export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({
    description:
      'Hata mesajı. Doğrulama hatalarında her alan için bir mesaj içeren dizi döner.',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Kayıt bulunamadı: 3f1c2b8e-5d7a-4c1e-9b2f-1a2b3c4d5e6f',
  })
  message: string | string[];

  @ApiProperty({ example: 'Not Found', required: false })
  error?: string;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

/** `{ data: T[], meta }` yanıtı için Swagger sınıfı üretir. */
export function PaginatedResponseDto<T>(item: Type<T>) {
  class PaginatedResponse {
    @ApiProperty({ type: [item] })
    data: T[];

    @ApiProperty({ type: PaginationMetaDto })
    meta: PaginationMetaDto;
  }
  Object.defineProperty(PaginatedResponse, 'name', {
    value: `Paginated${item.name}`,
  });
  return PaginatedResponse;
}

/** JWT ile korunan endpoint'lerin ortak dokümantasyonu. */
export function ApiProtected(): ClassDecorator & MethodDecorator {
  return applyDecorators(
    ApiBearerAuth(BEARER_AUTH),
    ApiUnauthorizedResponse({
      type: ErrorResponseDto,
      description: 'Token yok, geçersiz veya süresi dolmuş',
    }),
    ApiTooManyRequestsResponse({
      type: ErrorResponseDto,
      description: 'İstek sınırı aşıldı',
    }),
  );
}

export const ApiValidationError = (description = 'Geçersiz istek') =>
  ApiBadRequestResponse({ type: ErrorResponseDto, description });

export const ApiNotFound = (description: string) =>
  ApiNotFoundResponse({ type: ErrorResponseDto, description });

export const ApiConflict = (description: string) =>
  ApiConflictResponse({ type: ErrorResponseDto, description });
