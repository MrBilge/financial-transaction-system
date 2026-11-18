import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReportPeriodQueryDto } from './dto/report-period-query.dto';
import { VolumeInterval } from './dto/volume-query.dto';

/** Tüm gün sınırları ve tarih gruplamaları bu saat diliminde yapılır. */
export const REPORT_TIME_ZONE = 'Europe/Istanbul';

/** Varsayılan aralık: son 30 gün / 12 hafta / 12 ay. */
const DEFAULT_PERIOD_COUNT: Record<VolumeInterval, number> = {
  daily: 30,
  weekly: 12,
  monthly: 12,
};

/** Tek istekte döndürülebilecek en fazla periyot (aşırı büyük yanıtları önler). */
export const MAX_VOLUME_PERIODS = 1000;

export function assertValidDateRange({
  startDate,
  endDate,
}: ReportPeriodQueryDto): void {
  // YYYY-MM-DD formatında metin karşılaştırması tarih karşılaştırmasıyla aynıdır.
  if (startDate && endDate && startDate > endDate) {
    throw new BadRequestException('startDate, endDate değerinden sonra olamaz');
  }
}

/** Rapor saat dilimindeki bugünün tarihi (YYYY-MM-DD). */
export function todayInReportTimeZone(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TIME_ZONE,
  }).format(now);
}

/**
 * created_at için tarih aralığı koşulları. YYYY-MM-DD tarihleri PostgreSQL
 * tarafından Europe/Istanbul gün başlangıcına çevrilir; bitiş günü dahildir.
 */
export function createdAtInPeriod({
  startDate,
  endDate,
}: ReportPeriodQueryDto): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [];
  if (startDate) {
    conditions.push(
      Prisma.sql`created_at >= ((${startDate}::date)::timestamp AT TIME ZONE ${REPORT_TIME_ZONE})`,
    );
  }
  if (endDate) {
    conditions.push(
      Prisma.sql`created_at < ((${endDate}::date + 1)::timestamp AT TIME ZONE ${REPORT_TIME_ZONE})`,
    );
  }
  return conditions;
}

/** Koşulları AND ile birleştirip WHERE ifadesi üretir; koşul yoksa boş döner. */
export function sqlWhere(conditions: Prisma.Sql[]): Prisma.Sql {
  return conditions.length
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.empty;
}

/**
 * Hacim raporunun tarih aralığını belirler. Bitiş verilmezse bugün, başlangıç
 * verilmezse varsayılan periyot sayısı kadar geriye gidilir.
 */
export function resolveVolumeRange({
  interval,
  startDate,
  endDate,
}: {
  interval: VolumeInterval;
  startDate?: string;
  endDate?: string;
}): { startDate: string; endDate: string } {
  const end = endDate ?? todayInReportTimeZone();
  const start =
    startDate ?? shiftDate(end, interval, 1 - DEFAULT_PERIOD_COUNT[interval]);

  assertValidDateRange({ startDate: start, endDate: end });
  if (countPeriods(start, end, interval) > MAX_VOLUME_PERIODS) {
    throw new BadRequestException(
      `Tarih aralığı çok geniş: en fazla ${MAX_VOLUME_PERIODS} periyot döndürülebilir`,
    );
  }
  return { startDate: start, endDate: end };
}

// Aşağıdaki tarih hesapları saat diliminden bağımsız takvim tarihleri
// (YYYY-MM-DD) üzerinde yapılır; bu yüzden UTC gece yarısı kullanılır.
const toUtcDate = (date: string) => new Date(`${date}T00:00:00Z`);

function shiftDate(date: string, interval: VolumeInterval, by: number): string {
  const result = toUtcDate(date);
  if (interval === 'monthly') {
    result.setUTCMonth(result.getUTCMonth() + by, 1);
  } else {
    result.setUTCDate(
      result.getUTCDate() + by * (interval === 'weekly' ? 7 : 1),
    );
  }
  return result.toISOString().slice(0, 10);
}

/** Aralıktaki periyot sayısı (haftalıkta üst sınır tahmini). */
function countPeriods(
  start: string,
  end: string,
  interval: VolumeInterval,
): number {
  const from = toUtcDate(start);
  const to = toUtcDate(end);
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  switch (interval) {
    case 'daily':
      return days + 1;
    case 'weekly':
      return Math.floor(days / 7) + 2;
    case 'monthly':
      return (
        (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
        (to.getUTCMonth() - from.getUTCMonth()) +
        1
      );
  }
}
