import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

import {
  generateAgentToken,
  hashAgentToken,
} from '../agent-token.util';

@Injectable()
export class AgentCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createCredential(
    agentId: string,
  ) {
    const agent =
      await this.prisma.db.agent.findUnique({
        where: {
          id: agentId,
        },

        select: {
          id: true,
          name: true,
          enabled: true,
        },
      });

    if (!agent) {
      throw new NotFoundException({
        code: 'AGENT_NOT_FOUND',
        message: 'Agent não encontrado.',
        agentId,
      });
    }

    const token = generateAgentToken();

    const tokenHash =
      hashAgentToken(token);

    const credential =
      await this.prisma.db.agentCredential.create({
        data: {
          agentId,
          tokenHash,
        },

        select: {
          id: true,
          agentId: true,
          createdAt: true,
        },
      });

    return {
      credential,
      token,

      warning:
        'Este token será exibido apenas nesta resposta. Armazene-o com segurança.',
    };
  }

  async revokeCredential(
    agentId: string,
    credentialId: string,
  ) {
    const credential =
      await this.prisma.db.agentCredential.findFirst({
        where: {
          id: credentialId,
          agentId,
        },

        select: {
          id: true,
          revokedAt: true,
        },
      });

    if (!credential) {
      throw new NotFoundException({
        code: 'AGENT_CREDENTIAL_NOT_FOUND',
        message:
          'Credencial do Agent não encontrada.',
      });
    }

    if (!credential.revokedAt) {
      await this.prisma.db.agentCredential.update({
        where: {
          id: credentialId,
        },

        data: {
          revokedAt: new Date(),
        },
      });
    }

    return {
      status: 'revoked',
      credentialId,
    };
  }

  async listCredentials(
    agentId: string,
  ) {
    const agent =
      await this.prisma.db.agent.findUnique({
        where: {
          id: agentId,
        },

        select: {
          id: true,
        },
      });

    if (!agent) {
      throw new NotFoundException({
        code: 'AGENT_NOT_FOUND',
        message: 'Agent não encontrado.',
      });
    }

    return this.prisma.db.agentCredential.findMany({
      where: {
        agentId,
      },

      select: {
        id: true,
        createdAt: true,
        lastUsedAt: true,
        revokedAt: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}