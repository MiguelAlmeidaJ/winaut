import { ConfigService } from '@nestjs/config';
import { WinThorExecutionMode, WinThorHostingType } from '@winaut/contracts';

import type { PrismaService } from '../database/prisma.service';
import { AgentStatus } from '../generated/prisma/client';
import type { AuthenticatedAgent } from './agent-auth.types';
import type { AgentTokenService } from './agent-token.service';
import { AgentsService } from './agents.service';

const agent: AuthenticatedAgent = {
  id: '11111111-1111-4111-8111-111111111111',
  winthorInstanceId: '22222222-2222-4222-8222-222222222222',
  name: 'Worker A',
  hostname: 'worker-a',
  version: '0.1.0',
  status: AgentStatus.ONLINE,
  enabled: true,
};

describe('AgentsService.getConfig', () => {
  it('queries only the authenticated Agent instance and selects its matching profile', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: agent.id,
      name: agent.name,
      hostname: agent.hostname,
      version: agent.version,
      winthorInstance: {
        id: agent.winthorInstanceId,
        name: 'WinThor Cloud',
        hostingType: WinThorHostingType.TOTVS_CLOUD,
        executionMode: WinThorExecutionMode.GO_GLOBAL,
        timeZone: 'America/Sao_Paulo',
        accessProfiles: [
          {
            id: 'profile-rdp',
            type: WinThorExecutionMode.RDP,
            endpoint: 'rdp.example.test',
            applicationName: null,
            username: null,
            secretReference: null,
          },
          {
            id: 'profile-go-global',
            type: WinThorExecutionMode.GO_GLOBAL,
            endpoint: 'cloud.example.test',
            applicationName: 'WinThor',
            username: 'agent-user',
            secretReference: 'windows-credential:winthor-cloud',
          },
        ],
      },
    });
    const service = new AgentsService(
      { db: { agent: { findFirst } } } as unknown as PrismaService,
      {} as AgentTokenService,
      { get: jest.fn().mockReturnValue(180) } as unknown as ConfigService,
    );

    const config = await service.getConfig(agent);
    const calls = findFirst.mock.calls as unknown as Array<
      [{ where: { id: string; winthorInstanceId: string } }]
    >;

    expect(calls[0][0].where).toMatchObject({
      id: agent.id,
      winthorInstanceId: agent.winthorInstanceId,
    });
    expect(config.winthorInstance.id).toBe(agent.winthorInstanceId);
    expect(config.accessProfile?.id).toBe('profile-go-global');
  });
});
