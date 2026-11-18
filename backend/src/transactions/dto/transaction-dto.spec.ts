import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AccountOperationDto } from './account-operation.dto';
import {
  QueryAccountTransactionsDto,
  QueryTransactionDto,
} from './query-transaction.dto';
import { TransferDto } from './transfer.dto';

const ACCOUNT_A = '11111111-1111-4111-8111-111111111111';

const invalidFields = (cls: new () => object, plain: object): string[] =>
  validateSync(plainToInstance(cls, plain)).map((e) => e.property);

describe('Transaction DTOs', () => {
  describe('tutar doğrulaması', () => {
    it.each(['1', '0.01', '100.5', '1250.75', '9999999999999999.99'])(
      '"%s" geçerlidir',
      (amount) => {
        expect(
          invalidFields(AccountOperationDto, { accountId: ACCOUNT_A, amount }),
        ).toEqual([]);
      },
    );

    it.each([
      ['sıfır', '0'],
      ['sıfır (ondalıklı)', '0.00'],
      ['negatif', '-10'],
      ['3 ondalık basamak', '10.123'],
      ['number tipi', 100.5],
      ['metin', 'abc'],
      ['bilimsel gösterim', '1e3'],
      ['virgül', '10,50'],
      ['boşluklu', ' 10'],
      ['17 tam basamak', '12345678901234567'],
      ['eksik', undefined],
    ])('%s reddedilir', (_label, amount) => {
      expect(
        invalidFields(AccountOperationDto, { accountId: ACCOUNT_A, amount }),
      ).toEqual(['amount']);
    });
  });

  it('UUID alanlarını doğrular ve küçük harfe çevirir', () => {
    const dto = plainToInstance(TransferDto, {
      sourceAccountId: ACCOUNT_A.toUpperCase(),
      targetAccountId: 'abc',
      amount: '1',
    });

    expect(validateSync(dto).map((e) => e.property)).toEqual([
      'targetAccountId',
    ]);
    expect(dto.sourceAccountId).toBe(ACCOUNT_A);
  });

  describe('QueryTransactionDto', () => {
    it('varsayılanları ve geçerli filtreleri kabul eder', () => {
      const dto = plainToInstance(QueryTransactionDto, {
        type: 'DEPOSIT',
        status: 'FAILED',
        startDate: '2026-11-01',
        endDate: '2026-11-18T10:30:00Z',
        minAmount: '0',
        maxAmount: '150.75',
      });

      expect(validateSync(dto)).toHaveLength(0);
      expect(dto).toMatchObject({ page: 1, limit: 10, sortBy: 'createdAt' });
    });

    it('geçersiz filtreleri reddeder', () => {
      expect(
        invalidFields(QueryTransactionDto, {
          sortBy: 'status',
          accountId: 'x',
          type: 'REFUND',
          status: 'DONE',
          startDate: '18.11.2026',
          endDate: 'yarın',
          minAmount: '-1',
          maxAmount: '1.999',
        }).sort(),
      ).toEqual(
        [
          'sortBy',
          'accountId',
          'type',
          'status',
          'startDate',
          'endDate',
          'minAmount',
          'maxAmount',
        ].sort(),
      );
    });

    it('hesap geçmişi sorgusu accountId içermez', () => {
      const dto = plainToInstance(QueryAccountTransactionsDto, {});
      expect('accountId' in dto).toBe(false);
      expect(dto.sortBy).toBe('createdAt');
    });
  });
});
