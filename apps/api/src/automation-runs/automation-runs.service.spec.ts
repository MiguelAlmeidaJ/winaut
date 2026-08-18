import { AutomationDefinitionRegistry } from '../automation-definitions/automation-definition.registry';
import type { PrismaService } from '../database/prisma.service';
import { AutomationRunsService } from './automation-runs.service';

interface CreateRunArgs {
  data: {
    winthorInstanceId: string;
    scheduleId: string;
    deduplicationKey: string;
    steps: { create: unknown[] };
  };
}

describe('AutomationRunsService', () => {
  const schedule = {
    id: '11111111-1111-4111-8111-111111111111',
    winthorInstanceId: '22222222-2222-4222-8222-222222222222',
    automationCode: '507',
  };
  const create = jest.fn().mockResolvedValue({ id: 'run-id', steps: [] });
  const prisma = {
    db: { automationRun: { create } },
  } as unknown as PrismaService;
  const service = new AutomationRunsService(
    prisma,
    new AutomationDefinitionRegistry(),
  );

  beforeEach(() => create.mockClear());

  it('scopes scheduled deduplication to schedule and occurrence', async () => {
    const scheduledFor = new Date('2026-08-17T09:00:00.000Z');

    await service.createScheduledRun(prisma.db, schedule, scheduledFor);

    const calls = create.mock.calls as unknown as Array<[CreateRunArgs]>;
    const call = calls[0][0];
    expect(call.data.winthorInstanceId).toBe(schedule.winthorInstanceId);
    expect(call.data.scheduleId).toBe(schedule.id);
    expect(call.data.deduplicationKey).toBe(
      'schedule:11111111-1111-4111-8111-111111111111:2026-08-17T09:00:00.000Z',
    );
    expect(call.data.steps.create).toHaveLength(12);
  });

  it('uses a distinct key for every manual trigger', async () => {
    await service.createManualRun(schedule);
    await service.createManualRun(schedule);

    const createCalls = create.mock.calls as unknown as Array<[CreateRunArgs]>;
    const first = createCalls[0][0].data.deduplicationKey;
    const second = createCalls[1][0].data.deduplicationKey;
    expect(first).toMatch(/^manual:11111111-1111-4111-8111-111111111111:/);
    expect(second).not.toBe(first);
  });
});
