import 'dotenv/config';

import { AgentApiClient } from './communication/agent-api-client.js';
import { loadAgentEnvironment } from './config/agent-env.js';
import { WinThorAgentJobHandler } from './jobs/winthor-agent-job-handler.js';
import { AgentRuntime } from './runtime/agent-runtime.js';

async function main(): Promise<void> {
  const environment = loadAgentEnvironment();
  const controller = new AbortController();

  const stop = (signalName: string) => {
    if (controller.signal.aborted) {
      return;
    }

    console.log(`[Agent] ${signalName} received. Stopping...`);
    controller.abort();
  };

  process.once('SIGINT', () => stop('SIGINT'));
  process.once('SIGTERM', () => stop('SIGTERM'));

  const apiClient = new AgentApiClient({
    apiUrl: environment.apiUrl,
    token: environment.token,
    requestTimeoutMs: environment.requestTimeoutMs,
  });

  const jobHandler = new WinThorAgentJobHandler({
    configProvider: () => apiClient.getConfig(),
  });

  const runtime = new AgentRuntime({
    apiClient,
    version: environment.version,
    heartbeatIntervalMs: environment.heartbeatIntervalMs,
    jobLoopEnabled: environment.jobLoopEnabled,
    jobHandler,
  });

  await runtime.start(controller.signal);
}

void main().catch((error: unknown) => {
  console.error(
    '[Agent] Fatal startup error:',
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
