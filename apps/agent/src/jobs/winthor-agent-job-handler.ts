import type {
  AgentConfig,
  AgentJob,
} from '@winaut/contracts';

import type { AgentJobHandler } from './agent-job-handler.interface.js';
import {
  WinThorRoutineExecutorRegistry,
  type WinThorRoutineExecutorResolver,
} from '../winthor/executors/winthor-routine-executor.registry.js';
import { WinThorSessionFactory } from '../winthor/sessions/winthor-session.factory.js';
import type { WinThorSession } from '../winthor/sessions/winthor-session.interface.js';

interface WinThorSessionResolver {
  create(config: AgentConfig): WinThorSession;
}

interface WinThorAgentJobHandlerLogger {
  error(message: string, error?: unknown): void;
}

interface WinThorAgentJobHandlerOptions {
  configProvider: () => Promise<AgentConfig>;
  sessionFactory?: WinThorSessionResolver;
  executorRegistry?: WinThorRoutineExecutorResolver;
  logger?: WinThorAgentJobHandlerLogger;
}

export class WinThorAgentJobHandler implements AgentJobHandler {
  private readonly configProvider: () => Promise<AgentConfig>;
  private readonly sessionFactory: WinThorSessionResolver;
  private readonly executorRegistry: WinThorRoutineExecutorResolver;
  private readonly logger: WinThorAgentJobHandlerLogger;

  constructor(options: WinThorAgentJobHandlerOptions) {
    this.configProvider = options.configProvider;
    this.sessionFactory =
      options.sessionFactory ?? new WinThorSessionFactory();
    this.executorRegistry =
      options.executorRegistry ?? new WinThorRoutineExecutorRegistry();
    this.logger = options.logger ?? console;
  }

  async execute(
    job: AgentJob,
    signal: AbortSignal,
  ): Promise<Record<string, unknown> | undefined> {
    this.throwIfAborted(signal);

    const config = await this.configProvider();

    this.throwIfAborted(signal);
    this.assertJobInstance(job, config);

    const executor = this.executorRegistry.get(
      job.run.automationCode,
    );
    const session = this.sessionFactory.create(config);
    let connected = false;

    try {
      await session.connect();
      connected = true;

      this.throwIfAborted(signal);
      await session.ensureAuthenticated();
      this.throwIfAborted(signal);

      return await executor.execute(
        session,
        job.payload ?? {},
      );
    } finally {
      if (connected) {
        try {
          await session.disconnect();
        } catch (error) {
          this.logger.error(
            '[Agent] Failed to disconnect WinThor session.',
            error,
          );
        }
      }
    }
  }

  private assertJobInstance(
    job: AgentJob,
    config: AgentConfig,
  ): void {
    if (
      job.run.winthorInstanceId !==
      config.winthorInstance.id
    ) {
      throw new Error(
        `Job ${job.id} belongs to WinThor instance ${job.run.winthorInstanceId}, but this agent is configured for ${config.winthorInstance.id}.`,
      );
    }
  }

  private throwIfAborted(signal: AbortSignal): void {
    if (signal.aborted) {
      throw new Error('Agent job execution was aborted.');
    }
  }
}
