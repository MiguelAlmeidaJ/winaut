import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { PrismaService } from '../database/prisma.service';
import { AgentStatus } from '../generated/prisma/client';
import type { AuthenticatedAgent } from './agent-auth.types';
import { AgentTokenService } from './agent-token.service';

export interface AgentAuthenticatedRequest extends Request {
  agent?: AuthenticatedAgent;
}

@Injectable()
export class AgentAuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: AgentTokenService,
  ) {}

  async canActivate(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<AgentAuthenticatedRequest>();

    const authorization =
      request.headers.authorization;

    const [scheme, token] =
      authorization?.split(' ') ?? [];

    if (
      scheme?.toLowerCase() !== 'bearer' ||
      !token
    ) {
      throw new UnauthorizedException({
        code: 'AGENT_AUTH_REQUIRED',
        message:
          'Informe uma credencial Bearer de Agent válida.',
      });
    }

    const now = new Date();

    const credential =
      await this.prisma.db.agentCredential.findFirst({
        where: {
          tokenHash: this.tokens.hash(token),

          revokedAt: null,

          agent: {
            is: {
              enabled: true,

              status: {
                not: AgentStatus.DISABLED,
              },

              winthorInstance: {
                is: {
                  active: true,

                  company: {
                    is: {
                      active: true,
                    },
                  },
                },
              },
            },
          },
        },

        select: {
          id: true,

          agent: {
            select: {
              id: true,
              winthorInstanceId: true,
              name: true,
              hostname: true,
              version: true,
              status: true,
              enabled: true,
            },
          },
        },
      });

    if (!credential) {
      throw new UnauthorizedException({
        code: 'AGENT_CREDENTIAL_INVALID',
        message:
          'Credencial de Agent inválida ou revogada.',
      });
    }

    request.agent = credential.agent;

    await this.prisma.db.agentCredential.update({
      where: {
        id: credential.id,
      },

      data: {
        lastUsedAt: now,
      },
    });

    return true;
  }
}