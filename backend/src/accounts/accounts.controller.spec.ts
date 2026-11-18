import { Test } from '@nestjs/testing';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import {
  QueryAccountDto,
  QueryCustomerAccountsDto,
} from './dto/query-account.dto';

const ACCOUNT_ID = '7b1e4c2a-9d3f-4e5a-8b6c-1d2e3f4a5b6c';
const CUSTOMER_ID = '3f1c2b8e-5d7a-4c1e-9b2f-1a2b3c4d5e6f';

describe('AccountsController', () => {
  let controller: AccountsController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllByCustomer: jest.fn(),
    findOne: jest.fn(),
    updateStatus: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [{ provide: AccountsService, useValue: service }],
    }).compile();
    controller = moduleRef.get(AccountsController);
  });

  it('create isteğini servise iletir', async () => {
    await controller.create({ customerId: CUSTOMER_ID });
    expect(service.create).toHaveBeenCalledWith({ customerId: CUSTOMER_ID });
  });

  it('findAll isteğini servise iletir', async () => {
    const query = new QueryAccountDto();
    await controller.findAll(query);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('findOne isteğini servise iletir', async () => {
    await controller.findOne(ACCOUNT_ID);
    expect(service.findOne).toHaveBeenCalledWith(ACCOUNT_ID);
  });

  it('findAllByCustomer isteğini servise iletir', async () => {
    const query = new QueryCustomerAccountsDto();
    await controller.findAllByCustomer(CUSTOMER_ID, query);
    expect(service.findAllByCustomer).toHaveBeenCalledWith(CUSTOMER_ID, query);
  });

  it('updateStatus isteğini servise iletir', async () => {
    await controller.updateStatus(ACCOUNT_ID, { status: 'PASSIVE' });
    expect(service.updateStatus).toHaveBeenCalledWith(ACCOUNT_ID, {
      status: 'PASSIVE',
    });
  });
});
