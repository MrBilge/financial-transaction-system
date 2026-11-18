import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto';
import { VolumeQueryDto } from './dto/volume-query.dto';
import { ReportsService } from './reports.service';
import {
  AccountReport,
  SummaryReport,
  TransactionStatsReport,
  VolumeReport,
} from './reports.types';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  getSummary(@Query() query: ReportPeriodQueryDto): Promise<SummaryReport> {
    return this.reportsService.getSummary(query);
  }

  @Get('volume')
  getVolume(@Query() query: VolumeQueryDto): Promise<VolumeReport> {
    return this.reportsService.getVolume(query);
  }

  @Get('accounts/:id')
  getAccountReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ReportPeriodQueryDto,
  ): Promise<AccountReport> {
    return this.reportsService.getAccountReport(id, query);
  }

  @Get('transaction-stats')
  getTransactionStats(
    @Query() query: ReportPeriodQueryDto,
  ): Promise<TransactionStatsReport> {
    return this.reportsService.getTransactionStats(query);
  }
}
