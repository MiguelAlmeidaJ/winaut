import { hostname } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';

import type {
  AgentConfig,
  AgentJob,
} from '@winaut/contracts';

import type { AgentApiClient as AgentApiClientContract } from '../communication/agent-api-client.interface.js';
import type { AgentJobHandler } from '../jobs/agent-job-handler.interface.js';

const DEFAULT_JOB_POLL_INTERVAL_MS = 2_000;
const DEFAULT_JOB_HEARTBEAT_INTERVAL_MS = 30_000;

interface AgentRuntimeOptions {
  apiClient: AgentApiClientContract;
  version: string;
  heartbeatIntervalMs: number;
  jobLoopEnabled: boolean;
  jobPollIntervalMs?: number;
  jobHeartbeatIntervalMs?: number;
  jobHandler?: AgentJobHandler;
}

export class AgentRuntime {
  private readonly apiClient: AgentApiClientContract;
  private readonly version: string;
  private readonly heartbeatIntervalMs: number;
  private readonly jobLoopEnabled: boolean;
  private readonly jobPollIntervalMs: number;
  private readonly jobHeartbeatIntervalMs: number;
  private readonly jobHandler?: AgentJobHandler;

  private config?: AgentConfig;

  constructor(
    options: AgentRuntimeOptions,
  ) {
    this.apiClient = options.apiClient;
    this.version = options.version;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs;
    this.jobLoopEnabled = options.jobLoopEnabled;
    this.jobPollIntervalMs =
      options.jobPollIntervalMs ?? DEFAULT_JOB_POLL_INTERVAL_MS;
    this.jobHeartbeatIntervalMs =
      options.jobHeartbeatIntervalMs ?? DEFAULT_JOB_HEARTBEAT_INTERVAL_MS;
    this.jobHandler = options.jobHandler;
  }

  async start(
    signal: AbortSignal,
  ): Promise<void> {
    console.log(
      '[Agent] Starting Orquestra Agent...',
    );

    if (this.jobLoopEnabled && !this.jobHandler) {
      throw new Error(
        'WINAUT_AGENT_JOB_LOOP_ENABLED=true, but no AgentJobHandler is configured.',
      );
    }

    this.config =
      await this.apiClient.getConfig();

    this.logConfiguration(this.config);

    await this.sendHeartbeat();

    console.log(
      '[Agent] Initial heartbeat succeeded.',
    );

    if (!this.jobLoopEnabled) {
      console.log(
        '[Agent] Job loop disabled. Running in connectivity-only mode.',
      );
      await this.heartbeatLoop(signal);
      return;
    }

    console.log(
      `[Agent] Job loop enabled. Polling every ${this.jobPollIntervalMs}ms.`,
    );

    await Promise.all([
      this.heartbeatLoop(signal),
      this.jobLoop(signal),
    ]);
  }

  private async heartbeatLoop(
    signal: AbortSignal,
  ): Promise<void> {
    while (!signal.aborted) {
      if (!(await this.delay(this.heartbeatIntervalMs, signal))) {
        return;
      }

      try {
        await this.sendHeartbeat();

        console.log(
          `[Agent] Heartbeat OK - ${new Date().toISOString()}`,
        );
      } catch (error) {
        console.error(
          '[Agent] Heartbeat failed:',
          this.formatError(error),
        );
      }
    }
  }

  private async jobLoop(
    signal: AbortSignal,
  ): Promise<void> {
    while (!signal.aborted) {
      try {
        const response = await this.apiClient.claimJob();

        if (!response.job) {
          if (!(await this.delay(this.jobPollIntervalMs, signal))) {
            return;
          }
          continue;
        }

        await this.executeJob(response.job, signal);
      } catch (error) {
        if (signal.aborted) {
          return;
        }

        console.error(
          '[Agent] Job loop failed:',
          this.formatError(error),
        );

        if (!(await this.delay(this.jobPollIntervalMs, signal))) {
          return;
        }
      }
    }
  }

  private async executeJob(
    job: AgentJob,
    runtimeSignal: AbortSignal,
  ): Promise<void> {
    const handler = this.jobHandler;

    if (!handler) {
      throw new Error('AgentJobHandler is not configured.');
    }

    console.log(
      `[Agent] Job claimed: ${job.id} (${job.code}), attempt ${job.attemptCount}.`,
    );

    const jobController = new AbortController();
    let leaseFailure: unknown;
    let leaseHeartbeatRunning = false;

    const abortJob = () => {
      jobController.abort(runtimeSignal.reason);
    };

    runtimeSignal.addEventListener('abort', abortJob, {
      once: true,
    });

    const heartbeatLease = async () => {
      if (
        leaseHeartbeatRunning ||
        jobController.signal.aborted
      ) {
        return;
      }

      leaseHeartbeatRunning = true;
      try {
        await this.apiClient.heartbeatJob(
          job.id,
          job.claimToken,
        );
      } catch (error) {
        leaseFailure = error;
        console.error(
          `[Agent] Job lease heartbeat failed for ${job.id}:`,
          this.formatError(error),
        );
        jobController.abort(error);
      } finally {
        leaseHeartbeatRunning = false;
      }
    };

    const leaseTimer = setInterval(
      () => void heartbeatLease(),
      this.jobHeartbeatIntervalMs,
    );

    try {
      let result: Record<string, unknown> | undefined;

      try {
        result = await handler.execute(
          job,
          jobController.signal,
        );
      } catch (error) {
        if (runtimeSignal.aborted || leaseFailure) {
          return;
        }

        await this.reportJobFailure(job, error);
        return;
      }

      if (runtimeSignal.aborted) {
        return;
      }

      if (leaseFailure) {
        console.error(
          `[Agent] Job ${job.id} finished locally after its lease was lost; result will not be reported.`,
        );
        return;
      }

      try {
        await this.apiClient.succeedJob(
          job.id,
          job.claimToken,
          result,
        );
      } catch (error) {
        console.error(
          `[Agent] Could not report success for job ${job.id}:`,
          this.formatError(error),
        );
        return;
      }

      console.log(
        `[Agent] Job succeeded: ${job.id} (${job.code}).`,
      );
    } finally {
      clearInterval(leaseTimer);
      jobController.abort();
      runtimeSignal.removeEventListener('abort', abortJob);
    }
  }

  private async reportJobFailure(
    job: AgentJob,
    error: unknown,
  ): Promise<void> {
    const errorMessage = this.formatError(error).slice(0, 5000);

    try {
      await this.apiClient.failJob(
        job.id,
        job.claimToken,
        'AGENT_JOB_EXECUTION_FAILED',
        errorMessage,
      );
    } catch (reportError) {
      console.error(
        `[Agent] Could not report failure for job ${job.id}:`,
        this.formatError(reportError),
      );
      return;
    }

    console.error(
      `[Agent] Job failed: ${job.id} (${job.code}):`,
      errorMessage,
    );
  }

  private async sendHeartbeat(): Promise<void> {
    await this.apiClient.heartbeat({
      hostname: hostname(),
      version: this.version,

      capabilities: [
        'LOCAL_WINDOWS',
        'GO_GLOBAL',
      ],
    });
  }

  private async delay(
    milliseconds: number,
    signal: AbortSignal,
  ): Promise<boolean> {
    try {
      await sleep(
        milliseconds,
        undefined,
        { signal },
      );
      return true;
    } catch (error) {
      if (signal.aborted) {
        return false;
      }

      throw error;
    }
  }

  private logConfiguration(
    config: AgentConfig,
  ): void {
    console.log(
      `[Agent] Agent: ${config.agent.name} (${config.agent.id})`,
    );

    console.log(
      `[Agent] WinThor: ${config.winthorInstance.name}`,
    );

    console.log(
      `[Agent] Hosting: ${config.winthorInstance.hostingType}`,
    );

    console.log(
      `[Agent] Execution mode: ${config.winthorInstance.executionMode}`,
    );

    if (config.accessProfile) {
      console.log(
        `[Agent] Access profile: ${config.accessProfile.type}`,
      );
    } else {
      console.log(
        '[Agent] No access profile configured.',
      );
    }
  }

  private formatError(
    error: unknown,
  ): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }
}