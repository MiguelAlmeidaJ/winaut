import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  WinThorExecutionMode,
  WinThorHostingType,
  type AgentConfig,
  type AgentJob,
  type AgentJobClaimResponse,
} from '@winaut/contracts';

import type {
  AgentApiClient,
  AgentHeartbeatInput,
} from '../communication/agent-api-client.interface.js';
import type { AgentJobHandler } from '../jobs/agent-job-handler.interface.js';
import { AgentRuntime } from './agent-runtime.js';

const agentConfig: AgentConfig = {
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

const job: AgentJob = {
  id: 'step-id',
  runId: 'run-id',
  code: 'EXECUTE_ROUTINE_507',
  name: 'Executar rotina 507',
  sequenceNumber: 1,
  payload: { routine: 507 },
  claimToken: 'claim-token',
  leaseExpiresAt: new Date(Date.now() + 120_000).toISOString(),
  attemptCount: 1,
  run: {
    id: 'run-id',
    automationCode: '507',
    winthorInstanceId: 'instance-id',
    status: 'RUNNING',
  },
};

class FakeApiClient implements AgentApiClient {
  readonly succeeded: Array<{
    stepId: string;
    claimToken: string;
    result?: Record<string, unknown>;
  }> = [];

  readonly failed: Array<{
    stepId: string;
    claimToken: string;
    errorCode: string;
    errorMessage: string;
  }> = [];

  private claimed = false;

  constructor(
    private readonly controller: AbortController,
  ) {}

  getConfig(): Promise<AgentConfig> {
    return Promise.resolve(agentConfig);
  }

  heartbeat(_input: AgentHeartbeatInput): Promise<void> {
    return Promise.resolve();
  }

  claimJob(): Promise<AgentJobClaimResponse> {
    if (this.claimed) {
      return Promise.resolve({ job: null });
    }

    this.claimed = true;
    return Promise.resolve({ job });
  }

  heartbeatJob(
    _stepId: string,
    _claimToken: string,
  ): Promise<void> {
    return Promise.resolve();
  }

  succeedJob(
    stepId: string,
    claimToken: string,
    result?: Record<string, unknown>,
  ): Promise<void> {
    this.succeeded.push({ stepId, claimToken, result });
    this.controller.abort();
    return Promise.resolve();
  }

  failJob(
    stepId: string,
    claimToken: string,
    errorCode: string,
    errorMessage: string,
  ): Promise<void> {
    this.failed.push({
      stepId,
      claimToken,
      errorCode,
      errorMessage,
    });
    this.controller.abort();
    return Promise.resolve();
  }
}

function runtime(
  apiClient: AgentApiClient,
  jobHandler?: AgentJobHandler,
): AgentRuntime {
  return new AgentRuntime({
    apiClient,
    version: '0.1.0-test',
    heartbeatIntervalMs: 60_000,
    jobLoopEnabled: true,
    jobPollIntervalMs: 1,
    jobHeartbeatIntervalMs: 60_000,
    jobHandler,
  });
}

describe('AgentRuntime job loop', () => {
  it('fails fast when the loop is enabled without a handler', async () => {
    const controller = new AbortController();
    const apiClient = new FakeApiClient(controller);

    await assert.rejects(
      () => runtime(apiClient).start(controller.signal),
      /no AgentJobHandler is configured/,
    );
  });

  it('claims a job, executes the handler and reports success', async () => {
    const controller = new AbortController();
    const apiClient = new FakeApiClient(controller);
    const handler: AgentJobHandler = {
      execute: async (claimedJob, signal) => {
        assert.equal(claimedJob.id, job.id);
        assert.equal(signal.aborted, false);
        return { executed: true };
      },
    };

    await runtime(apiClient, handler).start(controller.signal);

    assert.deepEqual(apiClient.succeeded, [
      {
        stepId: job.id,
        claimToken: job.claimToken,
        result: { executed: true },
      },
    ]);
    assert.equal(apiClient.failed.length, 0);
  });

  it('reports handler errors as failed jobs', async () => {
    const controller = new AbortController();
    const apiClient = new FakeApiClient(controller);
    const handler: AgentJobHandler = {
      execute: async () => {
        throw new Error('WinThor indisponível');
      },
    };

    await runtime(apiClient, handler).start(controller.signal);

    assert.equal(apiClient.succeeded.length, 0);
    assert.equal(apiClient.failed.length, 1);
    assert.equal(
      apiClient.failed[0]?.errorCode,
      'AGENT_JOB_EXECUTION_FAILED',
    );
    assert.equal(
      apiClient.failed[0]?.errorMessage,
      'WinThor indisponível',
    );
  });
});
