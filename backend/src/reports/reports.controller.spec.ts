import { Test } from '@nestjs/testing';
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto';
import { VolumeQueryDto } from './dto/volume-query.dto';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

const ACCOUNT_ID = '7b1e4c2a-9d3f-4e5a-8b6c-1d2e3f4a5b6c';

describe('ReportsController', () => {
  let controller: ReportsController;
  const service = {
    getSummary: jest.fn(),
    getVolume: jest.fn(),
    getAccountReport: jest.fn(),
    getTransactionStats: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: service }],
    }).compile();
    controller = moduleRef.get(ReportsController);
  });

  it('istekleri servise iletir', async () => {
    const query = new ReportPeriodQueryDto();
    const volumeQuery = new VolumeQueryDto();

    await controller.getSummary(query);
    await controller.getVolume(volumeQuery);
    await controller.getAccountReport(ACCOUNT_ID, query);
    await controller.getTransactionStats(query);

    expect(service.getSummary).toHaveBeenCalledWith(query);
    expect(service.getVolume).toHaveBeenCalledWith(volumeQuery);
    expect(service.getAccountReport).toHaveBeenCalledWith(ACCOUNT_ID, query);
    expect(service.getTransactionStats).toHaveBeenCalledWith(query);
  });
});

describe('Report DTOs', () => {
  const invalidFields = (cls: new () => object, plain: object) =>
    validateSync(plainToInstance(cls, plain))
      .map((e) => e.property)
      .sort();

  it('tarihleri YYYY-MM-DD formatında ve geçerli takvim günü olarak ister', () => {
    expect(
      invalidFields(ReportPeriodQueryDto, {
        startDate: '2026-11-01',
        endDate: '2026-11-30',
      }),
    ).toEqual([]);
    expect(
      invalidFields(ReportPeriodQueryDto, {
        startDate: '2026-11-01T10:00:00Z',
        endDate: '2026-02-30',
      }),
    ).toEqual(['endDate', 'startDate']);
  });

  it('interval varsayılanı daily, geçersiz değer reddedilir', () => {
    expect(plainToInstance(VolumeQueryDto, {}).interval).toBe('daily');
    expect(invalidFields(VolumeQueryDto, { interval: 'yearly' })).toEqual([
      'interval',
    ]);
  });
});
