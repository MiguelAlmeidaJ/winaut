import { BadRequestException, Injectable } from '@nestjs/common';
import { CronTime } from 'cron';

@Injectable()
export class CronScheduleService {
  next(cronExpression: string, timeZone: string, from = new Date()): Date {
    try {
      const cronTime = new CronTime(cronExpression, timeZone);
      return cronTime.getNextDateFrom(from, timeZone).toJSDate();
    } catch (error) {
      throw new BadRequestException({
        code: 'INVALID_CRON_SCHEDULE',
        message: 'A expressão cron ou o timezone informado é inválido.',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
