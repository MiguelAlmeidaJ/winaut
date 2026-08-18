import { hostname } from 'node:os';

import {
  setTimeout as sleep,
} from 'node:timers/promises';

import type {
  AgentConfig,
} from '@winaut/contracts';

import { AgentApiClient } from '../communication/agent-api-client';

interface AgentRuntimeOptions {
  apiClient: AgentApiClient;
  version: string;
  heartbeatIntervalMs: number;
  jobLoopEnabled: boolean;
}

export class AgentRuntime {
  private readonly apiClient: AgentApiClient;
  private readonly version: string;
  private readonly heartbeatIntervalMs: number;
  private readonly jobLoopEnabled: boolean;

  private config?: AgentConfig;

  constructor(
    options: AgentRuntimeOptions,
  ) {
    this.apiClient = options.apiClient;
    this.version = options.version;

    this.heartbeatIntervalMs =
      options.heartbeatIntervalMs;

    this.jobLoopEnabled =
      options.jobLoopEnabled;
  }

  async start(
    signal: AbortSignal,
  ): Promise<void> {
    console.log(
      '[Agent] Starting WinAut Agent...',
    );

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
    }

    await this.heartbeatLoop(signal);
  }

  private async heartbeatLoop(
    signal: AbortSignal,
  ): Promise<void> {
    while (!signal.aborted) {
      try {
        await sleep(
          this.heartbeatIntervalMs,
          undefined,
          {
            signal,
          },
        );
      } catch (error) {
        if (signal.aborted) {
          return;
        }

        throw error;
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