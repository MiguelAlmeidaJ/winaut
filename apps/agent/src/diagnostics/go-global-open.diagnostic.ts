import 'dotenv/config';

import { setTimeout as sleep } from 'node:timers/promises';

import { WinThorExecutionMode } from '@winaut/contracts';

import { AgentApiClient } from '../communication/agent-api-client.js';
import { loadInstalledAgentEnvironment } from '../config/load-installed-agent-environment.js';
import { WinThorAuthenticationRequiredError } from '../winthor/sessions/winthor-session.errors.js';
import { GoGlobalWinThorSession } from '../winthor/sessions/go-global-winthor.session.js';

function routineCodeArgument(): number {
  const raw = process.argv
    .slice(2)
    .map((argument) => argument.trim())
    .find((argument) => argument && argument !== '--');
  const routineCode = Number(raw);

  if (!raw || !Number.isInteger(routineCode) || routineCode <= 0) {
    throw new Error(
      'Provide a positive WinThor routine code. Example: pnpm --filter @winaut/agent diagnose:goglobal -- 101',
    );
  }

  return routineCode;
}

function positiveIntegerEnvironment(
  name: string,
  defaultValue: number,
): number {
  const raw = process.env[name]?.trim();

  if (!raw) {
    return defaultValue;
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(
      `Environment variable "${name}" must be a positive integer.`,
    );
  }

  return value;
}

async function main(): Promise<void> {
  const routineCode = routineCodeArgument();
  const environment = await loadInstalledAgentEnvironment(
    undefined,
    { preferInstalledCredentials: true },
  );
  const apiClient = new AgentApiClient({
    apiUrl: environment.apiUrl,
    token: environment.token,
    requestTimeoutMs: environment.requestTimeoutMs,
  });

  console.log('[Diagnostic GO_GLOBAL] Loading agent configuration...');
  const config = await apiClient.getConfig();

  if (
    config.winthorInstance.executionMode !== WinThorExecutionMode.GO_GLOBAL
  ) {
    throw new Error(
      `GO_GLOBAL diagnostic requires a GO_GLOBAL WinThor instance, but this agent is configured for ${config.winthorInstance.executionMode}.`,
    );
  }

  console.log(
    `[Diagnostic GO_GLOBAL] Instance: ${config.winthorInstance.name}`,
  );
  console.log(
    `[Diagnostic GO_GLOBAL] Host Address: ${config.accessProfile?.endpoint ?? '(not configured)'}`,
  );
  console.log(
    `[Diagnostic GO_GLOBAL] Remote application: ${config.accessProfile?.applicationName ?? 'WinThor'}`,
  );

  const session = new GoGlobalWinThorSession(config.accessProfile);

  try {
    console.log('[Diagnostic GO_GLOBAL] Opening App Controller...');
    await session.connect();

    const holdMs = positiveIntegerEnvironment(
      'WINAUT_GOGLOBAL_DIAGNOSTIC_HOLD_MS',
      3_000,
    );

    try {
      console.log('[Diagnostic GO_GLOBAL] Authenticating GO-Global...');
      await session.ensureAuthenticated();

      console.log(
        `[Diagnostic GO_GLOBAL] Opening WinThor routine ${routineCode}. No business action will be executed inside the routine.`,
      );
      await session.openRoutine(routineCode);
    } catch (error) {
      if (error instanceof WinThorAuthenticationRequiredError) {
        console.log(
          '[Diagnostic GO_GLOBAL] WinThor internal login reached. Internal WinThor authentication is intentionally not automated yet.',
        );
        console.log(
          `[Diagnostic GO_GLOBAL] Routine ${routineCode} will NOT be opened. Holding the login screen for ${holdMs}ms for visual inspection...`,
        );
        await sleep(holdMs);
        console.log(
          '[Diagnostic GO_GLOBAL] Auto-launch test succeeded up to the WinThor internal login.',
        );
        return;
      }

      throw error;
    }

    console.log(
      `[Diagnostic GO_GLOBAL] Routine opened. Holding the session for ${holdMs}ms for visual inspection...`,
    );
    await sleep(holdMs);

    console.log('[Diagnostic GO_GLOBAL] Navigation test succeeded.');
  } finally {
    console.log('[Diagnostic GO_GLOBAL] Closing Agent-owned session...');
    await session.disconnect();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[Diagnostic GO_GLOBAL] Failed: ${message}`);
  process.exitCode = 1;
});
