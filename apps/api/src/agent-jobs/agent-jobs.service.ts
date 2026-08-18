import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

import type { AuthenticatedAgent } from '../agents/agent-auth.types';
import { PrismaService } from '../database/prisma.service';
import {
  AutomationRunStatus,
  AutomationStepStatus,
  Prisma,
} from '../generated/prisma/client';
import { CompleteAgentJobDto } from './dto/complete-agent-job.dto';
import { FailAgentJobDto } from './dto/fail-agent-job.dto';
import { HeartbeatAgentJobDto } from './dto/heartbeat-agent-job.dto';

@Injectable()
export class AgentJobsService {
  private readonly logger = new Logger(AgentJobsService.name);
  private readonly leaseSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    this.leaseSeconds = Number(
      configService.get('AGENT_JOB_LEASE_SECONDS') ?? 120,
    );

    if (!Number.isFinite(this.leaseSeconds) || this.leaseSeconds < 1) {
      throw new Error('AGENT_JOB_LEASE_SECONDS must be a positive number.');
    }
  }

  async claimNext(agent: AuthenticatedAgent) {
    const now = new Date();
    await this.requeueExpiredJobs(now);

    const response = await this.prisma.db.$transaction(async (tx) => {
      const candidates = await tx.automationStep.findMany({
        where: {
          status: AutomationStepStatus.PENDING,
          run: {
            is: {
              status: AutomationRunStatus.RUNNING,
              winthorInstanceId: agent.winthorInstanceId,
            },
          },
        },
        orderBy: [{ createdAt: 'asc' }, { sequenceNumber: 'asc' }],
        take: 100,
      });

      for (const candidate of candidates) {
        const blockingStep = await tx.automationStep.findFirst({
          where: {
            runId: candidate.runId,
            sequenceNumber: { lt: candidate.sequenceNumber },
            status: { not: AutomationStepStatus.SUCCEEDED },
          },
          select: { id: true },
        });

        if (blockingStep) {
          continue;
        }

        const claimToken = randomUUID();
        const leaseExpiresAt = this.createLeaseExpiration(now);
        const claimed = await tx.automationStep.updateMany({
          where: {
            id: candidate.id,
            status: AutomationStepStatus.PENDING,
            claimToken: null,
            run: {
              is: {
                status: AutomationRunStatus.RUNNING,
                winthorInstanceId: agent.winthorInstanceId,
              },
            },
          },
          data: {
            status: AutomationStepStatus.RUNNING,
            claimedByAgentId: agent.id,
            claimToken,
            claimedAt: now,
            leaseExpiresAt,
            startedAt: now,
            finishedAt: null,
            errorCode: null,
            errorMessage: null,
            attemptCount: { increment: 1 },
          },
        });

        if (claimed.count === 0) {
          continue;
        }

        const job = await tx.automationStep.findUniqueOrThrow({
          where: { id: candidate.id },
          include: {
            run: {
              select: {
                id: true,
                automationCode: true,
                winthorInstanceId: true,
                status: true,
              },
            },
          },
        });

        return { job };
      }

      return { job: null };
    });

    if (response.job) {
      this.logger.log(`Job claimed: ${response.job.id}; agent: ${agent.id}`);
    }

    return response;
  }

  async heartbeat(
    agent: AuthenticatedAgent,
    stepId: string,
    dto: HeartbeatAgentJobDto,
  ) {
    const now = new Date();
    const leaseExpiresAt = this.createLeaseExpiration(now);
    const result = await this.prisma.db.automationStep.updateMany({
      where: {
        id: stepId,
        status: AutomationStepStatus.RUNNING,
        claimedByAgentId: agent.id,
        claimToken: dto.claimToken,
        leaseExpiresAt: { gt: now },
        run: { is: { winthorInstanceId: agent.winthorInstanceId } },
      },
      data: { leaseExpiresAt },
    });

    this.ensureValidClaim(result.count, stepId);
    return { status: 'ok', leaseExpiresAt };
  }

  async succeed(
    agent: AuthenticatedAgent,
    stepId: string,
    dto: CompleteAgentJobDto,
  ) {
    const now = new Date();
    const run = await this.prisma.db.$transaction(async (tx) => {
      const update = await tx.automationStep.updateMany({
        where: {
          id: stepId,
          status: AutomationStepStatus.RUNNING,
          claimedByAgentId: agent.id,
          claimToken: dto.claimToken,
          leaseExpiresAt: { gt: now },
          run: { is: { winthorInstanceId: agent.winthorInstanceId } },
        },
        data: {
          status: AutomationStepStatus.SUCCEEDED,
          finishedAt: now,
          leaseExpiresAt: null,
          claimToken: null,
          errorCode: null,
          errorMessage: null,
          result:
            dto.result === undefined
              ? undefined
              : (dto.result as Prisma.InputJsonValue),
        },
      });

      this.ensureValidClaim(update.count, stepId);
      const step = await tx.automationStep.findUniqueOrThrow({
        where: { id: stepId },
        select: { runId: true },
      });
      const remainingSteps = await tx.automationStep.count({
        where: {
          runId: step.runId,
          status: { not: AutomationStepStatus.SUCCEEDED },
        },
      });

      if (remainingSteps === 0) {
        await tx.automationRun.updateMany({
          where: { id: step.runId, status: AutomationRunStatus.RUNNING },
          data: {
            status: AutomationRunStatus.SUCCEEDED,
            finishedAt: now,
            errorCode: null,
            errorMessage: null,
          },
        });
      }

      return tx.automationRun.findUniqueOrThrow({
        where: { id: step.runId },
        include: {
          steps: {
            orderBy: { sequenceNumber: 'asc' },
            omit: { claimToken: true },
          },
        },
      });
    });

    this.logger.log(`Job succeeded: ${stepId}; agent: ${agent.id}`);
    return run;
  }

  async fail(agent: AuthenticatedAgent, stepId: string, dto: FailAgentJobDto) {
    const now = new Date();
    const run = await this.prisma.db.$transaction(async (tx) => {
      const update = await tx.automationStep.updateMany({
        where: {
          id: stepId,
          status: AutomationStepStatus.RUNNING,
          claimedByAgentId: agent.id,
          claimToken: dto.claimToken,
          leaseExpiresAt: { gt: now },
          run: { is: { winthorInstanceId: agent.winthorInstanceId } },
        },
        data: {
          status: AutomationStepStatus.FAILED,
          finishedAt: now,
          leaseExpiresAt: null,
          claimToken: null,
          errorCode: dto.errorCode ?? 'AGENT_JOB_FAILED',
          errorMessage: dto.errorMessage,
        },
      });

      this.ensureValidClaim(update.count, stepId);
      const step = await tx.automationStep.findUniqueOrThrow({
        where: { id: stepId },
        select: { runId: true },
      });
      await tx.automationRun.updateMany({
        where: { id: step.runId, status: AutomationRunStatus.RUNNING },
        data: {
          status: AutomationRunStatus.FAILED,
          finishedAt: now,
          errorCode: dto.errorCode ?? 'AGENT_JOB_FAILED',
          errorMessage: dto.errorMessage,
        },
      });

      return tx.automationRun.findUniqueOrThrow({
        where: { id: step.runId },
        include: {
          steps: {
            orderBy: { sequenceNumber: 'asc' },
            omit: { claimToken: true },
          },
        },
      });
    });

    this.logger.warn(`Job failed: ${stepId}; agent: ${agent.id}`);
    return run;
  }

  async requeueExpiredJobs(now = new Date()): Promise<number> {
    const result = await this.prisma.db.automationStep.updateMany({
      where: {
        status: AutomationStepStatus.RUNNING,
        claimedByAgentId: { not: null },
        claimToken: { not: null },
        leaseExpiresAt: { lte: now },
      },
      data: {
        status: AutomationStepStatus.PENDING,
        claimedByAgentId: null,
        claimToken: null,
        claimedAt: null,
        leaseExpiresAt: null,
        startedAt: null,
        finishedAt: null,
      },
    });

    if (result.count > 0) {
      this.logger.warn(`Expired leases requeued: ${result.count}`);
    }

    return result.count;
  }

  private ensureValidClaim(count: number, stepId: string): void {
    if (count === 0) {
      throw new ConflictException({
        code: 'AGENT_JOB_CLAIM_INVALID',
        message: 'O claim não existe, expirou ou pertence a outro Agent.',
        stepId,
      });
    }
  }

  private createLeaseExpiration(from: Date): Date {
    return new Date(from.getTime() + this.leaseSeconds * 1000);
  }
}
