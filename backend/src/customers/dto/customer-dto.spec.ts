import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateCustomerDto } from './create-customer.dto';
import { QueryCustomerDto } from './query-customer.dto';
import { UpdateCustomerDto } from './update-customer.dto';

const invalidFields = (cls: new () => object, plain: object): string[] =>
  validateSync(plainToInstance(cls, plain)).map((e) => e.property);

describe('Customer DTOs', () => {
  describe('CreateCustomerDto', () => {
    it('alanları temizler ve e-postayı küçük harfe çevirir', () => {
      const dto = plainToInstance(CreateCustomerDto, {
        firstName: '  Mehmet Ali ',
        lastName: " O'Neil-Kaya ",
        email: '  Mehmet@Example.COM ',
      });

      expect(validateSync(dto)).toHaveLength(0);
      expect(dto).toEqual({
        firstName: 'Mehmet Ali',
        lastName: "O'Neil-Kaya",
        email: 'mehmet@example.com',
      });
    });

    it.each([
      ['eksik alanlar', {}, ['firstName', 'lastName', 'email']],
      [
        'boş / sadece boşluk',
        { firstName: '   ', lastName: '', email: 'a@b.com' },
        ['firstName', 'lastName'],
      ],
      [
        'rakam ve sembol içeren isim',
        { firstName: 'Ali1', lastName: 'Kaya!', email: 'a@b.com' },
        ['firstName', 'lastName'],
      ],
      [
        'geçersiz e-posta',
        { firstName: 'Ali', lastName: 'Kaya', email: 'ali@' },
        ['email'],
      ],
      [
        '100 karakteri aşan isim',
        { firstName: 'a'.repeat(101), lastName: 'Kaya', email: 'a@b.com' },
        ['firstName'],
      ],
    ])('%s için hata döndürür', (_label, plain, expected) => {
      expect(invalidFields(CreateCustomerDto, plain)).toEqual(expected);
    });
  });

  describe('UpdateCustomerDto', () => {
    it('kısmi güncellemeye izin verir ama gönderilen alanı doğrular', () => {
      expect(invalidFields(UpdateCustomerDto, { lastName: 'Kaya' })).toEqual(
        [],
      );
      expect(invalidFields(UpdateCustomerDto, { email: 'geçersiz' })).toEqual([
        'email',
      ]);
    });
  });

  describe('QueryCustomerDto', () => {
    it('varsayılan değerleri uygular ve sayıları dönüştürür', () => {
      const dto = plainToInstance(QueryCustomerDto, { page: '2' });

      expect(validateSync(dto)).toHaveLength(0);
      expect(dto).toMatchObject({
        page: 2,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('geçersiz parametreleri reddeder', () => {
      expect(
        invalidFields(QueryCustomerDto, {
          page: '0',
          limit: '101',
          sortBy: 'password',
          sortOrder: 'up',
        }),
      ).toEqual(
        expect.arrayContaining(['page', 'limit', 'sortBy', 'sortOrder']),
      );
    });
  });
});
