import { ConfigService } from '@nestjs/config';
import type { SchedulerRegistry } from '@nestjs/schedule';

import type { AutomationRunsService } from '../automation-runs/automation-runs.service';
import type { PrismaService } from '../database/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { AutomationDispatcherService } from './automation-dispatcher.service';

describe('AutomationDispatcherService', () => {
  it('commits only one run when the database rejects a duplicate occurrence', async () => {
    const scheduledFor = new Date('2026-08-17T09:00:00.000Z');
    const schedule = {
      id: '11111111-1111-4111-8111-111111111111',
      winthorInstanceId: '22222222-2222-4222-8222-222222222222',
      automationCode: '552',
      enabled: true,
      cronExpression: '0 0 6 * * 1',
      timeZone: 'America/Sao_Paulo',
      nextRunAt: scheduledFor,
    };
    const tx = {
      automationSchedule: {
        findFirst: jest.fn().mockResolvedValue(schedule),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const db = {
      automationSchedule: { findMany: jest.fn().mockResolvedValue([schedule]) },
      $transaction: jest.fn(
        (callback: (transaction: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };
    const duplicate = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '7.9.1' },
    );
    const createScheduledRun = jest
      .fn()
      .mockResolvedValueOnce({ id: 'run-1' })
      .mockRejectedValueOnce(duplicate);
    const service = new AutomationDispatcherService(
      { get: jest.fn().mockReturnValue(60_000) } as unknown as ConfigService,
      {} as SchedulerRegistry,
      { db } as unknown as PrismaService,
      { createScheduledRun } as unknown as AutomationRunsService,
      {
        next: jest.fn().mockReturnValue(new Date('2026-08-24T09:00:00.000Z')),
      },
    );

    await expect(service.dispatchDueSchedules(scheduledFor)).resolves.toBe(1);
    await expect(service.dispatchDueSchedules(scheduledFor)).resolves.toBe(0);
    expect(createScheduledRun).toHaveBeenCalledTimes(2);
    expect(tx.automationSchedule.updateMany).toHaveBeenCalledTimes(1);
  });
});
