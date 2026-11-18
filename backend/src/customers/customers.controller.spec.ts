import { Test } from '@nestjs/testing';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { QueryCustomerDto } from './dto/query-customer.dto';

const ID = '3f1c2b8e-5d7a-4c1e-9b2f-1a2b3c4d5e6f';

describe('CustomersController', () => {
  let controller: CustomersController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [CustomersController],
      providers: [{ provide: CustomersService, useValue: service }],
    }).compile();
    controller = moduleRef.get(CustomersController);
  });

  it('create isteğini servise iletir', async () => {
    const dto = { firstName: 'Ayşe', lastName: 'Yılmaz', email: 'a@b.com' };
    service.create.mockResolvedValue({ id: ID, ...dto });

    await expect(controller.create(dto)).resolves.toEqual({ id: ID, ...dto });
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('findAll isteğini servise iletir', async () => {
    const query = new QueryCustomerDto();
    service.findAll.mockResolvedValue({ data: [], meta: {} });

    await controller.findAll(query);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('findOne isteğini servise iletir', async () => {
    service.findOne.mockResolvedValue({ id: ID });

    await controller.findOne(ID);
    expect(service.findOne).toHaveBeenCalledWith(ID);
  });

  it('update isteğini servise iletir', async () => {
    service.update.mockResolvedValue({ id: ID });

    await controller.update(ID, { lastName: 'Kaya' });
    expect(service.update).toHaveBeenCalledWith(ID, { lastName: 'Kaya' });
  });
});
