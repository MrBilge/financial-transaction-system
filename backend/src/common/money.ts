import { applyDecorators } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { IsString, Matches } from 'class-validator';

/**
 * Parasal değerler API'ye string olarak girer ve string olarak çıkar; arada
 * yalnızca Prisma.Decimal kullanılır. JavaScript number (IEEE 754) ondalık
 * değerleri tam temsil edemediği için hiçbir aşamada number'a çevrilmez.
 *
 * Decimal(18,2) sınırı: en fazla 16 tam sayı basamağı, en fazla 2 ondalık basamak.
 */
const MONEY_PATTERN = /^\d{1,16}(\.\d{1,2})?$/;
// Aynı format, ancak sıfır ("0", "0.0", "0.00", "000") hariç.
const POSITIVE_MONEY_PATTERN = /^(?!0+(\.0{1,2})?$)\d{1,16}(\.\d{1,2})?$/;

/** İşlem tutarı: sıfırdan büyük, en fazla 2 ondalık basamaklı string. */
export function IsPositiveMoneyAmount(): PropertyDecorator {
  return applyDecorators(
    IsString({
      message: '$property string olarak gönderilmelidir, ör. "150.75"',
    }),
    Matches(POSITIVE_MONEY_PATTERN, {
      message:
        '$property sıfırdan büyük, en fazla 16 tam ve 2 ondalık basamaklı bir tutar olmalıdır',
    }),
  );
}

/** Filtre tutarı: sıfır dahil, en fazla 2 ondalık basamaklı string. */
export function IsMoneyAmount(): PropertyDecorator {
  return applyDecorators(
    IsString({
      message: '$property string olarak gönderilmelidir, ör. "150.75"',
    }),
    Matches(MONEY_PATTERN, {
      message:
        '$property negatif olmayan, en fazla 16 tam ve 2 ondalık basamaklı bir tutar olmalıdır',
    }),
  );
}

/** API yanıtları için 2 ondalık basamaklı string (ör. "1250.50"). */
export function toMoneyString(value: Prisma.Decimal): string {
  return value.toFixed(2);
}
