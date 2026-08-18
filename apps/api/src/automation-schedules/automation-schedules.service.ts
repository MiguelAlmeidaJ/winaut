import { Injectable, NotFoundException } from '@nestjs/common';

import { AutomationDefinitionRegistry } from '../automation-definitions/automation-definition.registry';
import { AutomationRunsService } from '../automation-runs/automation-runs.service';
import { PrismaService } from '../database/prisma.service';
import { CronScheduleService } from './cron-schedule.service';
import { CreateAutomationScheduleDto } from './dto/create-automation-schedule.dto';
import { UpdateAutomationScheduleDto } from './dto/update-automation-schedule.dto';

@Injectable()
export class AutomationSchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly definitions: AutomationDefinitionRegistry,
    private readonly cron: CronScheduleService,
    private readonly runs: AutomationRunsService,
  ) {}

  async create(dto: CreateAutomationScheduleDto) {
    this.definitions.get(dto.automationCode);
    await this.ensureInstanceExists(dto.winthorInstanceId);
    const nextRunAt = this.cron.next(dto.cronExpression, dto.timeZone);

    return this.prisma.db.automationSchedule.create({
      data: {
        winthorInstanceId: dto.winthorInstanceId,
        automationCode: dto.automationCode,
        name: dto.name,
        enabled: dto.enabled,
        timeZone: dto.timeZone,
        cronExpression: dto.cronExpression,
        nextRunAt,
      },
      include: { winthorInstance: { include: { company: true } } },
    });
  }

  findAll() {
    return this.prisma.db.automationSchedule.findMany({
      orderBy: [{ nextRunAt: 'asc' }, { name: 'asc' }],
      include: { winthorInstance: { include: { company: true } } },
    });
  }

  async findOne(id: string) {
    const schedule = await this.prisma.db.automationSchedule.findUnique({
      where: { id },
      include: { winthorInstance: { include: { company: true } } },
    });

    if (!schedule) {
      throw new NotFoundException({
        code: 'AUTOMATION_SCHEDULE_NOT_FOUND',
        message: 'Agendamento não encontrado.',
        id,
      });
    }

    return schedule;
  }

  async update(id: string, dto: UpdateAutomationScheduleDto) {
    const current = await this.findOne(id);
    const cronExpression = dto.cronExpression ?? current.cronExpression;
    const timeZone = dto.timeZone ?? current.timeZone;
    const scheduleChanged =
      dto.cronExpression !== undefined ||
      dto.timeZone !== undefined ||
      (dto.enabled === true && !current.enabled);
    const nextRunAt = scheduleChanged
      ? this.cron.next(cronExpression, timeZone)
      : current.nextRunAt;

    return this.prisma.db.automationSchedule.update({
      where: { id },
      data: {
        name: dto.name,
        enabled: dto.enabled,
        timeZone: dto.timeZone,
        cronExpression: dto.cronExpression,
        nextRunAt,
      },
      include: { winthorInstance: { include: { company: true } } },
    });
  }

  async trigger(id: string) {
    const schedule = await this.findOne(id);
    return this.runs.createManualRun(schedule);
  }

  private async ensureInstanceExists(id: string): Promise<void> {
    const instance = await this.prisma.db.winThorInstance.findFirst({
      where: { id, active: true, company: { is: { active: true } } },
      select: { id: true },
    });

    if (!instance) {
      throw new NotFoundException({
        code: 'WINTHOR_INSTANCE_NOT_FOUND',
        message: 'Ambiente WinThor ativo não encontrado.',
        id,
      });
    }
  }
}
