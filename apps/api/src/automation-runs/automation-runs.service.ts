import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { AutomationDefinitionRegistry } from '../automation-definitions/automation-definition.registry';
import { PrismaService } from '../database/prisma.service';
import { ListAutomationRunsDto } from './dto/list-automation-runs.dto';
import {
  AutomationRunStatus,
  AutomationStepStatus,
  Prisma,
} from '../generated/prisma/client';

interface RunSource {
  id: string;
  winthorInstanceId: string;
  automationCode: string;
}

@Injectable()
export class AutomationRunsService {
  private readonly logger = new Logger(AutomationRunsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly definitions: AutomationDefinitionRegistry,
  ) {}

  createScheduledRun(
    tx: Prisma.TransactionClient,
    schedule: RunSource,
    scheduledFor: Date,
  ) {
    const deduplicationKey = this.scheduledDeduplicationKey(
      schedule.id,
      scheduledFor,
    );

    return this.createRun(tx, schedule, deduplicationKey, scheduledFor);
  }

  async createManualRun(schedule: RunSource) {
    const deduplicationKey = `manual:${schedule.id}:${randomUUID()}`;
    const run = await this.createRun(
      this.prisma.db,
      schedule,
      deduplicationKey,
      null,
    );

    this.logger.log(
      `Manual run created: ${run.id} (${schedule.automationCode})`,
    );
    return this.findOne(run.id);
  }

  findAll(query: ListAutomationRunsDto) {
    const createdAt =
      query.from || query.to
        ? {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to ? { lte: new Date(query.to) } : {}),
          }
        : undefined;

    return this.prisma.db.automationRun.findMany({
      where: {
        winthorInstanceId: query.winthorInstanceId,
        automationCode: query.automationCode,
        status: query.status,
        createdAt,
        ...(query.companyId
          ? {
              winthorInstance: {
                is: {
                  companyId: query.companyId,
                },
              },
            }
          : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: query.limit,
      include: {
        winthorInstance: {
          include: {
            company: true,
          },
        },
        schedule: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const run = await this.prisma.db.automationRun.findUnique({
      where: { id },
      include: {
        winthorInstance: { include: { company: true } },
        schedule: true,
        steps: {
          orderBy: { sequenceNumber: 'asc' },
          omit: { claimToken: true },
          include: {
            claimedByAgent: {
              select: { id: true, name: true, hostname: true },
            },
          },
        },
      },
    });

    if (!run) {
      throw new NotFoundException({
        code: 'AUTOMATION_RUN_NOT_FOUND',
        message: 'Execução de automação não encontrada.',
        id,
      });
    }

    return run;
  }

  scheduledDeduplicationKey(scheduleId: string, scheduledFor: Date): string {
    return `schedule:${scheduleId}:${scheduledFor.toISOString()}`;
  }

  private createRun(
    client: Prisma.TransactionClient | PrismaService['db'],
    schedule: RunSource,
    deduplicationKey: string,
    scheduledFor: Date | null,
  ) {
    const definition = this.definitions.get(schedule.automationCode);
    const now = new Date();

    return client.automationRun.create({
      data: {
        winthorInstanceId: schedule.winthorInstanceId,
        scheduleId: schedule.id,
        automationCode: schedule.automationCode,
        deduplicationKey,
        status: AutomationRunStatus.RUNNING,
        scheduledFor,
        startedAt: now,
        steps: {
          create: definition.steps.map((step) => ({
            code: step.code,
            name: step.name,
            sequenceNumber: step.sequenceNumber,
            status: AutomationStepStatus.PENDING,
            payload: step.payload as Prisma.InputJsonValue,
          })),
        },
      },
      include: { steps: { orderBy: { sequenceNumber: 'asc' } } },
    });
  }
}
