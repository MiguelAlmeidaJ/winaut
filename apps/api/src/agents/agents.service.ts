import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { AgentConfig } from '@winaut/contracts';

import { PrismaService } from '../database/prisma.service';
import { AgentStatus } from '../generated/prisma/client';
import type { AuthenticatedAgent } from './agent-auth.types';
import { AgentHeartbeatDto } from './dto/agent-heartbeat.dto';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);
  private readonly onlineThresholdMs: number;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.onlineThresholdMs =
      Number(configService.get('AGENT_ONLINE_THRESHOLD_SECONDS') ?? 180) * 1000;

    if (
      !Number.isFinite(this.onlineThresholdMs) ||
      this.onlineThresholdMs < 1000
    ) {
      throw new Error(
        'AGENT_ONLINE_THRESHOLD_SECONDS must be a positive number.',
      );
    }
  }

  async create(dto: CreateAgentDto) {
    const instance = await this.prisma.db.winThorInstance.findFirst({
      where: { id: dto.winthorInstanceId, active: true },
      select: { id: true },
    });

    if (!instance) {
      throw new NotFoundException({
        code: 'WINTHOR_INSTANCE_NOT_FOUND',
        message: 'Ambiente WinThor ativo não encontrado.',
        id: dto.winthorInstanceId,
      });
    }

    const created = await this.prisma.db.agent.create({
      data: {
        winthorInstanceId: dto.winthorInstanceId,
        name: dto.name,
        hostname: dto.hostname?.trim() || `pending-${randomUUID()}`,
        version: dto.version,
        status: AgentStatus.OFFLINE,
      },
      include: { winthorInstance: { include: { company: true } } },
    });

    this.logger.log(
      `Agent registered: ${created.id} (${created.winthorInstanceId})`,
    );

    return {
      agent: this.withTemporalStatus(created),
    };
  }

  async heartbeat(agent: AuthenticatedAgent, dto: AgentHeartbeatDto) {
    const now = new Date();
    const updated = await this.prisma.db.agent.update({
      where: { id: agent.id },
      data: {
        lastSeenAt: now,
        status: AgentStatus.ONLINE,
        hostname: dto.hostname,
        version: dto.version,
      },
      include: { winthorInstance: { include: { company: true } } },
    });

    this.logger.log(`Agent heartbeat: ${agent.id}`);
    return this.withTemporalStatus(updated, now);
  }

  async getConfig(agent: AuthenticatedAgent): Promise<AgentConfig> {
    const configuredAgent = await this.prisma.db.agent.findFirst({
      where: {
        id: agent.id,
        winthorInstanceId: agent.winthorInstanceId,
        enabled: true,
      },
      select: {
        id: true,
        name: true,
        hostname: true,
        version: true,
        winthorInstance: {
          select: {
            id: true,
            name: true,
            hostingType: true,
            executionMode: true,
            timeZone: true,
            accessProfiles: {
              where: { enabled: true },
              orderBy: { updatedAt: 'desc' },
              select: {
                id: true,
                type: true,
                endpoint: true,
                applicationName: true,
                username: true,
                secretReference: true,
              },
            },
          },
        },
      },
    });

    if (!configuredAgent) {
      throw new NotFoundException({
        code: 'AGENT_CONFIG_NOT_FOUND',
        message: 'Configuração do Agent não encontrada.',
      });
    }

    const { accessProfiles, ...winthorInstance } =
      configuredAgent.winthorInstance;
    const accessProfile =
      accessProfiles.find(
        (profile) => profile.type === winthorInstance.executionMode,
      ) ?? null;

    this.logger.log(`Agent config requested: ${agent.id}`);

    return {
      agent: {
        id: configuredAgent.id,
        name: configuredAgent.name,
        hostname: configuredAgent.hostname,
        version: configuredAgent.version,
      },
      winthorInstance,
      accessProfile,
    };
  }

  async findAll() {
    const now = new Date();
    const agents = await this.prisma.db.agent.findMany({
      orderBy: { name: 'asc' },
      include: { winthorInstance: { include: { company: true } } },
    });

    return agents.map((agent) => this.withTemporalStatus(agent, now));
  }

  async findOne(id: string) {
    const agent = await this.prisma.db.agent.findUnique({
      where: { id },
      include: { winthorInstance: { include: { company: true } } },
    });

    if (!agent) {
      throw new NotFoundException({
        code: 'AGENT_NOT_FOUND',
        message: 'Agent não encontrado.',
        id,
      });
    }

    return this.withTemporalStatus(agent);
  }

  async update(id: string, dto: UpdateAgentDto) {
    const current = await this.findOne(id);

    const updated = await this.prisma.db.agent.update({
      where: { id },
      data: {
        enabled: dto.enabled,
        status:
          current.enabled === dto.enabled
            ? current.status
            : dto.enabled
              ? AgentStatus.OFFLINE
              : AgentStatus.DISABLED,
      },
      include: { winthorInstance: { include: { company: true } } },
    });

    this.logger.log(
      `Agent ${dto.enabled ? 'enabled' : 'disabled'}: ${updated.id}`,
    );

    return this.withTemporalStatus(updated);
  }

  private withTemporalStatus<
    T extends {
      enabled: boolean;
      lastSeenAt: Date | null;
      status: AgentStatus;
    },
  >(agent: T, now = new Date()): T & { online: boolean } {
    return {
      ...agent,
      online:
        agent.enabled &&
        agent.status === AgentStatus.ONLINE &&
        agent.lastSeenAt !== null &&
        now.getTime() - agent.lastSeenAt.getTime() <= this.onlineThresholdMs,
    };
  }
}
