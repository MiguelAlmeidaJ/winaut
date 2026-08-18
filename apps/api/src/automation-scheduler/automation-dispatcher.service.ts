import {
  ConflictException,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';

import { AutomationRunsService } from '../automation-runs/automation-runs.service';
import { CronScheduleService } from '../automation-schedules/cron-schedule.service';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';

const DISPATCH_INTERVAL_NAME = 'automation-schedule-dispatcher';

@Injectable()
export class AutomationDispatcherService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(AutomationDispatcherService.name);
  private readonly intervalMs: number;
  private dispatching = false;

  constructor(
    configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly prisma: PrismaService,
    private readonly runs: AutomationRunsService,
    private readonly cron: CronScheduleService,
  ) {
    this.intervalMs = Number(
      configService.get('SCHEDULER_DISPATCH_INTERVAL') ?? 60_000,
    );

    if (!Number.isFinite(this.intervalMs) || this.intervalMs < 1_000) {
      throw new Error(
        'SCHEDULER_DISPATCH_INTERVAL must be at least 1000 milliseconds.',
      );
    }
  }

  onApplicationBootstrap(): void {
    const interval = setInterval(() => {
      void this.tick();
    }, this.intervalMs);

    this.schedulerRegistry.addInterval(DISPATCH_INTERVAL_NAME, interval);
    this.logger.log(
      `Database schedule dispatcher enabled every ${this.intervalMs}ms.`,
    );
    void this.tick();
  }

  onModuleDestroy(): void {
    if (this.schedulerRegistry.doesExist('interval', DISPATCH_INTERVAL_NAME)) {
      this.schedulerRegistry.deleteInterval(DISPATCH_INTERVAL_NAME);
    }
  }

  async dispatchDueSchedules(now = new Date()): Promise<number> {
    const schedules = await this.prisma.db.automationSchedule.findMany({
      where: {
        enabled: true,
        nextRunAt: { lte: now },
        winthorInstance: {
          is: { active: true, company: { is: { active: true } } },
        },
      },
      orderBy: { nextRunAt: 'asc' },
      take: 100,
    });

    let dispatched = 0;
    for (const schedule of schedules) {
      try {
        const run = await this.dispatchSchedule(schedule.id, now);
        if (run) {
          dispatched += 1;
          this.logger.log(
            `Schedule dispatched: ${schedule.id}; run created: ${run.id}`,
          );
        }
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          this.logger.log(`Run deduplicated for schedule ${schedule.id}.`);
          continue;
        }

        if (error instanceof ConflictException) {
          this.logger.log(
            `Schedule ${schedule.id} was dispatched concurrently.`,
          );
          continue;
        }

        this.logger.error(
          `Failed to dispatch schedule ${schedule.id}.`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return dispatched;
  }

  private async tick(): Promise<void> {
    if (this.dispatching) {
      return;
    }

    this.dispatching = true;
    try {
      await this.dispatchDueSchedules();
    } catch (error) {
      this.logger.error(
        'Unhandled scheduler dispatcher error.',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.dispatching = false;
    }
  }

  private dispatchSchedule(scheduleId: string, now: Date) {
    return this.prisma.db.$transaction(async (tx) => {
      const schedule = await tx.automationSchedule.findFirst({
        where: {
          id: scheduleId,
          enabled: true,
          nextRunAt: { lte: now },
          winthorInstance: {
            is: { active: true, company: { is: { active: true } } },
          },
        },
      });

      if (!schedule) {
        return null;
      }

      const scheduledFor = schedule.nextRunAt;
      const nextRunAt = this.cron.next(
        schedule.cronExpression,
        schedule.timeZone,
        scheduledFor,
      );
      const run = await this.runs.createScheduledRun(
        tx,
        schedule,
        scheduledFor,
      );
      const advanced = await tx.automationSchedule.updateMany({
        where: {
          id: schedule.id,
          enabled: true,
          nextRunAt: scheduledFor,
        },
        data: {
          lastRunAt: scheduledFor,
          nextRunAt,
        },
      });

      if (advanced.count !== 1) {
        throw new ConflictException('Schedule advanced concurrently.');
      }

      return run;
    });
  }
}
