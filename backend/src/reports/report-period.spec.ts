import { BadRequestException } from '@nestjs/common';
import {
  createdAtInPeriod,
  resolveVolumeRange,
  sqlWhere,
  todayInReportTimeZone,
} from './report-period';

describe('report-period', () => {
  describe('todayInReportTimeZone', () => {
    it('günü Europe/Istanbul saatine göre belirler', () => {
      // UTC 21:30 = İstanbul 00:30 (ertesi gün)
      expect(todayInReportTimeZone(new Date('2026-11-18T21:30:00Z'))).toBe(
        '2026-11-19',
      );
      expect(todayInReportTimeZone(new Date('2026-11-18T20:59:00Z'))).toBe(
        '2026-11-18',
      );
    });
  });

  describe('createdAtInPeriod / sqlWhere', () => {
    it('yalnızca verilen tarihler için koşul üretir', () => {
      expect(createdAtInPeriod({})).toEqual([]);
      expect(sqlWhere([]).sql).toBe('');

      const where = sqlWhere(
        createdAtInPeriod({ startDate: '2026-11-01', endDate: '2026-11-30' }),
      );
      expect(where.sql).toMatch(/^WHERE created_at >= .* AND created_at < /);
      expect(where.values).toEqual([
        '2026-11-01',
        'Europe/Istanbul',
        '2026-11-30',
        'Europe/Istanbul',
      ]);
    });
  });

  describe('resolveVolumeRange', () => {
    beforeAll(() => {
      jest.useFakeTimers({ now: new Date('2026-11-18T10:00:00Z') });
    });
    afterAll(() => {
      jest.useRealTimers();
    });

    it.each([
      ['daily', '2026-10-20'],
      ['weekly', '2026-09-02'],
      ['monthly', '2025-12-01'],
    ] as const)(
      '%s için varsayılan aralığı bugünden geriye hesaplar',
      (interval, start) => {
        expect(resolveVolumeRange({ interval })).toEqual({
          startDate: start,
          endDate: '2026-11-18',
        });
      },
    );

    it('verilen aralığı olduğu gibi kullanır', () => {
      expect(
        resolveVolumeRange({
          interval: 'daily',
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        }),
      ).toEqual({ startDate: '2026-01-01', endDate: '2026-01-31' });
    });

    it('ters aralığı ve çok geniş aralığı reddeder', () => {
      expect(() =>
        resolveVolumeRange({
          interval: 'daily',
          startDate: '2026-02-01',
          endDate: '2026-01-01',
        }),
      ).toThrow(BadRequestException);
      expect(() =>
        resolveVolumeRange({ interval: 'daily', startDate: '2020-01-01' }),
      ).toThrow(/en fazla 1000 periyot/);
      expect(() =>
        resolveVolumeRange({ interval: 'monthly', startDate: '2020-01-01' }),
      ).not.toThrow();
    });
  });
});
