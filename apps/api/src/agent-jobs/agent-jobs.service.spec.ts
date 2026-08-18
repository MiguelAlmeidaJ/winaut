import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AuthenticatedAgent } from '../agents/agent-auth.types';
import type { PrismaService } from '../database/prisma.service';
import {
  AgentStatus,
  AutomationRunStatus,
  AutomationStepStatus,
} from '../generated/prisma/client';
import { AgentJobsService } from './agent-jobs.service';

const agent: AuthenticatedAgent = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  winthorInstanceId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  name: 'Agent A',
  hostname: 'host-a',
  version: null,
  status: AgentStatus.ONLINE,
  enabled: true,
};

interface FakeTransaction {
  automationStep: {
    findMany: jest.Mock;
    findFirst: jest.Mock;
    updateMany: jest.Mock;
    findUniqueOrThrow: jest.Mock;
    count: jest.Mock;
  };
  automationRun: {
    updateMany: jest.Mock;
    findUniqueOrThrow: jest.Mock;
  };
}

function setup(transactionOverrides: Partial<FakeTransaction> = {}) {
  const tx: FakeTransaction = {
    automationStep: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ runId: 'run-1' }),
      count: jest.fn().mockResolvedValue(1),
    },
    automationRun: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'run-1' }),
    },
    ...transactionOverrides,
  };
  const expiredUpdate = jest.fn().mockResolvedValue({ count: 0 });
  const db = {
    automationStep: { updateMany: expiredUpdate },
    $transaction: jest.fn(
      (callback: (transaction: FakeTransaction) => Promise<unknown>) =>
        callback(tx),
    ),
  };
  const service = new AgentJobsService(
    { db } as unknown as PrismaService,
    { get: jest.fn().mockReturnValue(120) } as unknown as ConfigService,
  );

  return { service, tx, expiredUpdate };
}

describe('AgentJobsService', () => {
  it('filters claims by the authenticated Agent WinThor instance', async () => {
    const { service, tx } = setup();

    await service.claimNext(agent);

    const calls = tx.automationStep.findMany.mock.calls as unknown as Array<
      [
        {
          where: { run: { is: { status: string; winthorInstanceId: string } } };
        },
      ]
    >;
    const call = calls[0][0];
    expect(call.where.run.is).toEqual({
      status: AutomationRunStatus.RUNNING,
      winthorInstanceId: agent.winthorInstanceId,
    });
  });

  it('does not claim step 2 while a previous step is not SUCCEEDED', async () => {
    const candidate = {
      id: 'step-2',
      runId: 'run-1',
      sequenceNumber: 2,
      createdAt: new Date(),
    };
    const { service, tx } = setup();
    tx.automationStep.findMany.mockResolvedValue([candidate]);
    tx.automationStep.findFirst.mockResolvedValue({ id: 'step-1' });

    await expect(service.claimNext(agent)).resolves.toEqual({ job: null });
    expect(tx.automationStep.updateMany).not.toHaveBeenCalled();
  });

  it('rejects completion when the claim belongs to another Agent', async () => {
    const { service, tx } = setup();
    tx.automationStep.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.succeed(agent, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', {
        claimToken: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    const calls = tx.automationStep.updateMany.mock.calls as unknown as Array<
      [{ where: { claimedByAgentId: string } }]
    >;
    const call = calls[0][0];
    expect(call.where.claimedByAgentId).toBe(agent.id);
  });

  it('completes the run when the last step succeeds', async () => {
    const { service, tx } = setup();
    tx.automationStep.count.mockResolvedValue(0);

    await service.succeed(agent, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', {
      claimToken: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    });

    const calls = tx.automationRun.updateMany.mock.calls as unknown as Array<
      [{ data: { status: string } }]
    >;
    const call = calls[0][0];
    expect(call.data.status).toBe(AutomationRunStatus.SUCCEEDED);
  });

  it('fails the run when a claimed step fails', async () => {
    const { service, tx } = setup();

    await service.fail(agent, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', {
      claimToken: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      errorMessage: 'WinThor unavailable',
    });

    const calls = tx.automationRun.updateMany.mock.calls as unknown as Array<
      [{ data: { status: string } }]
    >;
    const call = calls[0][0];
    expect(call.data.status).toBe(AutomationRunStatus.FAILED);
  });

  it('requeues only expired Agent claims', async () => {
    const { service, expiredUpdate } = setup();
    expiredUpdate.mockResolvedValue({ count: 1 });
    const now = new Date('2026-08-17T09:00:00.000Z');

    await expect(service.requeueExpiredJobs(now)).resolves.toBe(1);
    expect(expiredUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: AutomationStepStatus.RUNNING,
          claimedByAgentId: { not: null },
          claimToken: { not: null },
          leaseExpiresAt: { lte: now },
        },
      }),
    );
  });
});
