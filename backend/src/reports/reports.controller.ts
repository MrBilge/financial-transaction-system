import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiNotFound,
  ApiProtected,
  ApiUuidParam,
  ApiValidationError,
} from '../common/api-docs';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto';
import {
  AccountReportDto,
  SummaryReportDto,
  TransactionStatsReportDto,
  VolumeReportDto,
} from './dto/report-response.dto';
import { VolumeQueryDto } from './dto/volume-query.dto';
import { ReportsService } from './reports.service';
import {
  AccountReport,
  SummaryReport,
  TransactionStatsReport,
  VolumeReport,
} from './reports.types';

const INVALID_PERIOD = 'Geçersiz tarih (YYYY-MM-DD) veya startDate > endDate';

@ApiTags('Reports')
@ApiProtected()
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Genel özet',
    description:
      'Müşteri / hesap sayıları ve toplam bakiye anlık değerlerdir. Para girişi (DEPOSIT), çıkışı (WITHDRAWAL) ve transfer hacmi seçilen dönemdeki SUCCESS işlemlerden hesaplanır; transferler giriş/çıkışa dahil edilmez.',
  })
  @ApiOkResponse({ type: SummaryReportDto })
  @ApiValidationError(INVALID_PERIOD)
  getSummary(@Query() query: ReportPeriodQueryDto): Promise<SummaryReport> {
    return this.reportsService.getSummary(query);
  }

  @Get('volume')
  @ApiOperation({
    summary: 'Günlük / haftalık / aylık işlem hacmi',
    description:
      'Europe/Istanbul saat dilimine göre gruplanır. İşlem olmayan periyotlar sıfır değerlerle döner.',
  })
  @ApiOkResponse({ type: VolumeReportDto })
  @ApiValidationError(
    `${INVALID_PERIOD}, geçersiz interval veya 1000'den fazla periyot`,
  )
  getVolume(@Query() query: VolumeQueryDto): Promise<VolumeReport> {
    return this.reportsService.getVolume(query);
  }

  @Get('accounts/:id')
  @ApiOperation({
    summary: 'Hesap bazlı para hareketleri',
    description:
      'SUCCESS işlemler. Transferler hesap kaynaksa giden, hedefse gelen hareket olarak sayılır.',
  })
  @ApiUuidParam('Hesap ID')
  @ApiOkResponse({ type: AccountReportDto })
  @ApiValidationError(`Geçersiz UUID, ${INVALID_PERIOD}`)
  @ApiNotFound('Hesap bulunamadı')
  getAccountReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ReportPeriodQueryDto,
  ): Promise<AccountReport> {
    return this.reportsService.getAccountReport(id, query);
  }

  @Get('transaction-stats')
  @ApiOperation({
    summary: 'İşlem istatistikleri',
    description:
      'Durum (SUCCESS / FAILED / PENDING) ve tür bazlı sayılar; tutarlar yalnızca SUCCESS işlemlerden hesaplanır.',
  })
  @ApiOkResponse({ type: TransactionStatsReportDto })
  @ApiValidationError(INVALID_PERIOD)
  getTransactionStats(
    @Query() query: ReportPeriodQueryDto,
  ): Promise<TransactionStatsReport> {
    return this.reportsService.getTransactionStats(query);
  }
}
