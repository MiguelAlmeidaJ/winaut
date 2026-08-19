import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  WinThorExecutionMode,
  WinThorHostingType,
  type AgentConfig,
  type AgentJob,
  type AgentJobPayload,
} from '@winaut/contracts';

import type { WinThorRoutineExecutor } from '../winthor/executors/winthor-routine-executor.interface.js';
import {
  WinThorRoutineExecutorRegistry,
} from '../winthor/executors/winthor-routine-executor.registry.js';
import {
  UnsupportedWinThorAutomationError,
  WinThorRoutineExecutionNotImplementedError,
} from '../winthor/executors/winthor-routine-executor.errors.js';
import type { WinThorSession } from '../winthor/sessions/winthor-session.interface.js';
import { WinThorAgentJobHandler } from './winthor-agent-job-handler.js';

const config: AgentConfig = {
  agent: {
    id: 'agent-id',
    name: 'Agent Produção',
    hostname: 'worker-01',
    version: '0.1.0',
  },
  winthorInstance: {
    id: 'instance-id',
    name: 'WinThor Produção',
    hostingType: WinThorHostingType.ON_PREMISE,
    executionMode: WinThorExecutionMode.LOCAL_WINDOWS,
    timeZone: 'America/Sao_Paulo',
  },
  accessProfile: null,
};

function createJob(
  overrides: Partial<AgentJob> = {},
): AgentJob {
  return {
    id: 'step-id',
    runId: 'run-id',
    code: 'RECALCULATE_DAILY_TURNOVER_BRANCH_1',
    name: 'Opção 4 — Giro Dia — Filial 1',
    sequenceNumber: 1,
    payload: {
      action: 'RECALCULATE_DAILY_TURNOVER',
      routine: 507,
      option: 4,
      branch: '1',
      branchName: 'Filial 1',
    },
    claimToken: 'claim-token',
    leaseExpiresAt: new Date(Date.now() + 120_000).toISOString(),
    attemptCount: 1,
    run: {
      id: 'run-id',
      automationCode: '507',
      winthorInstanceId: 'instance-id',
      status: 'RUNNING',
    },
    ...overrides,
  };
}

class FakeSession implements WinThorSession {
  readonly calls: string[] = [];

  connect(): Promise<void> {
    this.calls.push('connect');
    return Promise.resolve();
  }

  ensureAuthenticated(): Promise<void> {
    this.calls.push('ensureAuthenticated');
    return Promise.resolve();
  }

  openRoutine(_routineCode: number): Promise<void> {
    this.calls.push('openRoutine');
    return Promise.resolve();
  }

  disconnect(): Promise<void> {
    this.calls.push('disconnect');
    return Promise.resolve();
  }
}

class FakeExecutor implements WinThorRoutineExecutor {
  receivedPayload?: AgentJobPayload;

  execute(
    _session: WinThorSession,
    payload: AgentJobPayload,
  ): Promise<Record<string, unknown>> {
    this.receivedPayload = payload;
    return Promise.resolve({ dispatched: true });
  }
}

describe('WinThorAgentJobHandler', () => {
  it('routes dynamic 507 step codes by automationCode and closes the session', async () => {
    const session = new FakeSession();
    const executor = new FakeExecutor();
    const requestedCodes: string[] = [];

    const handler = new WinThorAgentJobHandler({
      configProvider: () => Promise.resolve(config),
      sessionFactory: {
        create: () => session,
      },
      executorRegistry: {
        get: (automationCode) => {
          requestedCodes.push(automationCode);
          return executor;
        },
      },
    });

    const result = await handler.execute(
      createJob(),
      new AbortController().signal,
    );

    assert.deepEqual(requestedCodes, ['507']);
    assert.deepEqual(session.calls, [
      'connect',
      'ensureAuthenticated',
      'disconnect',
    ]);
    assert.equal(
      executor.receivedPayload?.action,
      'RECALCULATE_DAILY_TURNOVER',
    );
    assert.deepEqual(result, { dispatched: true });
  });

  it('rejects a job assigned to another WinThor instance before opening a session', async () => {
    let sessionCreated = false;

    const handler = new WinThorAgentJobHandler({
      configProvider: () => Promise.resolve(config),
      sessionFactory: {
        create: () => {
          sessionCreated = true;
          return new FakeSession();
        },
      },
    });

    await assert.rejects(
      () =>
        handler.execute(
          createJob({
            run: {
              id: 'run-id',
              automationCode: '507',
              winthorInstanceId: 'another-instance',
              status: 'RUNNING',
            },
          }),
          new AbortController().signal,
        ),
      /belongs to WinThor instance another-instance/,
    );

    assert.equal(sessionCreated, false);
  });

  it('keeps 507 and 552 as explicit non-success scaffolds', async () => {
    const registry = new WinThorRoutineExecutorRegistry();
    const session = new FakeSession();

    await assert.rejects(
      () =>
        registry.get('507').execute(session, {
          routine: 507,
          action: 'RECALCULATE_MERCHANDISE_TURNOVER',
          month: 0,
          branch: '1',
        }),
      WinThorRoutineExecutionNotImplementedError,
    );

    await assert.rejects(
      () =>
        registry.get('552').execute(session, {
          routine: 552,
          preserveExistingConfiguration: true,
        }),
      WinThorRoutineExecutionNotImplementedError,
    );
  });

  it('rejects unsupported automation codes explicitly', () => {
    const registry = new WinThorRoutineExecutorRegistry();

    assert.throws(
      () => registry.get('999'),
      UnsupportedWinThorAutomationError,
    );
  });
});
