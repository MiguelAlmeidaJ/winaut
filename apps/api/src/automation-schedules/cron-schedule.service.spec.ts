import { CronScheduleService } from './cron-schedule.service';

describe('CronScheduleService', () => {
  const service = new CronScheduleService();

  it('interprets cron in the schedule timezone and returns UTC Date', () => {
    const next = service.next(
      '0 0 6 * * 1',
      'America/Sao_Paulo',
      new Date('2026-08-16T12:00:00.000Z'),
    );

    expect(next.toISOString()).toBe('2026-08-17T09:00:00.000Z');
  });
});
