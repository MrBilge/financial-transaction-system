import { Test } from '@nestjs/testing';
import {
  QueryAccountTransactionsDto,
  QueryTransactionDto,
} from './dto/query-transaction.dto';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

const ACCOUNT_A = '11111111-1111-4111-8111-111111111111';
const ACCOUNT_B = '22222222-2222-4222-8222-222222222222';
const TX_ID = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  const service = {
    deposit: jest.fn(),
    withdraw: jest.fn(),
    transfer: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findAllByAccount: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [{ provide: TransactionsService, useValue: service }],
    }).compile();
    controller = moduleRef.get(TransactionsController);
  });

  it('deposit ve withdraw isteklerini servise iletir', async () => {
    const dto = { accountId: ACCOUNT_A, amount: '10' };
    await controller.deposit(dto);
    await controller.withdraw(dto);
    expect(service.deposit).toHaveBeenCalledWith(dto);
    expect(service.withdraw).toHaveBeenCalledWith(dto);
  });

  it('transfer isteğini servise iletir', async () => {
    const dto = {
      sourceAccountId: ACCOUNT_A,
      targetAccountId: ACCOUNT_B,
      amount: '10',
    };
    await controller.transfer(dto);
    expect(service.transfer).toHaveBeenCalledWith(dto);
  });

  it('listeleme ve detay isteklerini servise iletir', async () => {
    const query = new QueryTransactionDto();
    const accountQuery = new QueryAccountTransactionsDto();

    await controller.findAll(query);
    await controller.findOne(TX_ID);
    await controller.findAllByAccount(ACCOUNT_A, accountQuery);

    expect(service.findAll).toHaveBeenCalledWith(query);
    expect(service.findOne).toHaveBeenCalledWith(TX_ID);
    expect(service.findAllByAccount).toHaveBeenCalledWith(
      ACCOUNT_A,
      accountQuery,
    );
  });
});
