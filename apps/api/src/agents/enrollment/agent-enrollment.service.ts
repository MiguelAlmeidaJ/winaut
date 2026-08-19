import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../database/prisma.service';
import { AgentStatus } from '../../generated/prisma/client';
import { AgentTokenService } from '../agent-token.service';
import { EnrollAgentDto } from './enroll-agent.dto';

@Injectable()
export class AgentEnrollmentService {
  private readonly logger = new Logger(AgentEnrollmentService.name);
  private readonly ttlMs: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: AgentTokenService,
    configService: ConfigService,
  ) {
    const ttlMinutes = Number(
      configService.get('AGENT_ENROLLMENT_TTL_MINUTES') ?? 15,
    );

    if (!Number.isFinite(ttlMinutes) || ttlMinutes <= 0) {
      throw new Error(
        'AGENT_ENROLLMENT_TTL_MINUTES must be a positive number.',
      );
    }

    this.ttlMs = ttlMinutes * 60_000;
  }

  async create(agentId: string) {
    const agent = await this.prisma.db.agent.findFirst({
      where: {
        id: agentId,
        enabled: true,
        status: { not: AgentStatus.DISABLED },
        winthorInstance: {
          is: {
            active: true,
            company: { is: { active: true } },
          },
        },
      },
      select: {
        id: true,
        name: true,
        winthorInstanceId: true,
      },
    });

    if (!agent) {
      throw new NotFoundException({
        code: 'AGENT_NOT_FOUND',
        message: 'Agent ativo não encontrado.',
        agentId,
      });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlMs);
    const activationCode = this.tokens.generateEnrollmentCode();

    await this.prisma.db.$transaction(async (tx) => {
      await tx.agentEnrollment.updateMany({
        where: {
          agentId,
          consumedAt: null,
        },
        data: {
          consumedAt: now,
        },
      });

      await tx.agentEnrollment.create({
        data: {
          agentId,
          codeHash: this.tokens.hashEnrollmentCode(activationCode),
          expiresAt,
        },
      });
    });

    this.logger.log(`Agent activation code issued: ${agentId}`);

    return {
      agent,
      activation: {
        code: activationCode,
        expiresAt,
        warning:
          'Este código é de uso único e será exibido apenas nesta resposta.',
      },
    };
  }

  async enroll(dto: EnrollAgentDto) {
    const now = new Date();
    const codeHash = this.tokens.hashEnrollmentCode(dto.activationCode);

    const enrollment = await this.prisma.db.agentEnrollment.findFirst({
      where: {
        codeHash,
        consumedAt: null,
        expiresAt: { gt: now },
        agent: {
          is: {
            enabled: true,
            status: { not: AgentStatus.DISABLED },
            winthorInstance: {
              is: {
                active: true,
                company: { is: { active: true } },
              },
            },
          },
        },
      },
      select: {
        id: true,
        agentId: true,
        agent: {
          select: {
            id: true,
            name: true,
            winthorInstanceId: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw this.invalidActivationCode();
    }

    const token = this.tokens.generate();

    await this.prisma.db.$transaction(async (tx) => {
      const consumed = await tx.agentEnrollment.updateMany({
        where: {
          id: enrollment.id,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });

      if (consumed.count !== 1) {
        throw this.invalidActivationCode();
      }

      await tx.agentCredential.updateMany({
        where: {
          agentId: enrollment.agentId,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });

      await tx.agentCredential.create({
        data: {
          agentId: enrollment.agentId,
          tokenHash: this.tokens.hash(token),
        },
      });

      await tx.agent.update({
        where: { id: enrollment.agentId },
        data: {
          hostname: dto.hostname,
          version: dto.version,
          status: AgentStatus.OFFLINE,
          registeredAt: now,
          lastSeenAt: null,
        },
      });
    });

    this.logger.log(`Agent enrolled: ${enrollment.agentId}`);

    return {
      agent: enrollment.agent,
      credential: {
        token,
        warning:
          'Credencial emitida uma única vez. O Agent deve armazená-la de forma segura.',
      },
    };
  }

  private invalidActivationCode(): UnauthorizedException {
    return new UnauthorizedException({
      code: 'AGENT_ACTIVATION_INVALID',
      message: 'Código de ativação inválido, expirado ou já utilizado.',
    });
  }
}
