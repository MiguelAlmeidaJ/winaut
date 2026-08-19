import { ConfigService } from '@nestjs/config';

import type { PrismaService } from '../../database/prisma.service';
import { AgentStatus } from '../../generated/prisma/client';
import { AgentTokenService } from '../agent-token.service';
import { AgentEnrollmentService } from './agent-enrollment.service';

const agent = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Agent Matriz',
  winthorInstanceId: '22222222-2222-4222-8222-222222222222',
};

describe('AgentEnrollmentService', () => {
  const tokens = new AgentTokenService();
  const config = {
    get: jest.fn().mockReturnValue(15),
  } as unknown as ConfigService;

  it('issues a one-time activation code without storing plaintext', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const create = jest.fn().mockResolvedValue({ id: 'enrollment-id' });
    const transaction = jest.fn(async (callback: (tx: unknown) => unknown) =>
      callback({
        agentEnrollment: { updateMany, create },
      }),
    );
    const prisma = {
      db: {
        agent: { findFirst: jest.fn().mockResolvedValue(agent) },
        $transaction: transaction,
      },
    } as unknown as PrismaService;
    const service = new AgentEnrollmentService(prisma, tokens, config);

    const result = await service.create(agent.id);

    expect(result.activation.code).toMatch(/^ORQ-/);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        agentId: agent.id,
        codeHash: expect.not.stringContaining(result.activation.code),
      }),
    });
  });

  it('exchanges a valid activation code and revokes previous credentials', async () => {
    const activationCode = tokens.generateEnrollmentCode();
    const credentialUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    const credentialCreate = jest.fn().mockResolvedValue({ id: 'credential-id' });
    const agentUpdate = jest.fn().mockResolvedValue(agent);
    const transaction = jest.fn(async (callback: (tx: unknown) => unknown) =>
      callback({
        agentEnrollment: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        agentCredential: {
          updateMany: credentialUpdateMany,
          create: credentialCreate,
        },
        agent: { update: agentUpdate },
      }),
    );
    const prisma = {
      db: {
        agentEnrollment: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'enrollment-id',
            agentId: agent.id,
            agent,
          }),
        },
        $transaction: transaction,
      },
    } as unknown as PrismaService;
    const service = new AgentEnrollmentService(prisma, tokens, config);

    const result = await service.enroll({
      activationCode,
      hostname: 'WIN-AUTOMACAO',
      version: '0.1.0',
    });

    expect(result.credential.token).toMatch(/^winaut_agent_/);
    expect(credentialUpdateMany).toHaveBeenCalledWith({
      where: { agentId: agent.id, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(agentUpdate).toHaveBeenCalledWith({
      where: { id: agent.id },
      data: expect.objectContaining({
        hostname: 'WIN-AUTOMACAO',
        version: '0.1.0',
        status: AgentStatus.OFFLINE,
      }),
    });
  });

  it('rejects an invalid, expired or consumed activation code', async () => {
    const prisma = {
      db: {
        agentEnrollment: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      },
    } as unknown as PrismaService;
    const service = new AgentEnrollmentService(prisma, tokens, config);

    await expect(
      service.enroll({
        activationCode: tokens.generateEnrollmentCode(),
        hostname: 'WIN-AUTOMACAO',
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'AGENT_ACTIVATION_INVALID',
      }),
    });
  });
});
