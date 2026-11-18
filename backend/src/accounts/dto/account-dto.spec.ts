import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateAccountDto } from './create-account.dto';
import { QueryAccountDto, QueryCustomerAccountsDto } from './query-account.dto';
import { UpdateAccountStatusDto } from './update-account-status.dto';

const CUSTOMER_ID = '3f1c2b8e-5d7a-4c1e-9b2f-1a2b3c4d5e6f';

const invalidFields = (cls: new () => object, plain: object): string[] =>
  validateSync(plainToInstance(cls, plain)).map((e) => e.property);

describe('Account DTOs', () => {
  it('CreateAccountDto geçerli bir customerId ister', () => {
    expect(
      invalidFields(CreateAccountDto, { customerId: CUSTOMER_ID }),
    ).toEqual([]);
    expect(invalidFields(CreateAccountDto, {})).toEqual(['customerId']);
    expect(invalidFields(CreateAccountDto, { customerId: '123' })).toEqual([
      'customerId',
    ]);
  });

  it('UpdateAccountStatusDto yalnızca geçerli durumları kabul eder', () => {
    expect(
      invalidFields(UpdateAccountStatusDto, { status: 'PASSIVE' }),
    ).toEqual([]);
    expect(invalidFields(UpdateAccountStatusDto, { status: 'CLOSED' })).toEqual(
      ['status'],
    );
  });

  describe('QueryAccountDto', () => {
    it('varsayılan değerleri uygular', () => {
      const dto = plainToInstance(QueryAccountDto, { limit: '20' });

      expect(validateSync(dto)).toHaveLength(0);
      expect(dto).toMatchObject({
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('geçersiz filtre ve sıralama parametrelerini reddeder', () => {
      expect(
        invalidFields(QueryAccountDto, {
          sortBy: 'customerId',
          customerId: 'abc',
          status: 'DELETED',
          search: '1'.repeat(35),
        }),
      ).toEqual(
        expect.arrayContaining(['sortBy', 'search', 'customerId', 'status']),
      );
    });
  });

  it('QueryCustomerAccountsDto varsayılanları korur ve customerId içermez', () => {
    const dto = plainToInstance(QueryCustomerAccountsDto, {});

    expect(validateSync(dto)).toHaveLength(0);
    expect(dto).toMatchObject({ page: 1, limit: 10, sortBy: 'createdAt' });
    expect('customerId' in dto).toBe(false);
  });
});
