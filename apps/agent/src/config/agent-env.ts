export interface AgentEnvironment {
  apiUrl: string;
  token: string;
  version: string;
  heartbeatIntervalMs: number;
  requestTimeoutMs: number;
  jobLoopEnabled: boolean;
}

function required(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Required environment variable "${name}" is missing.`,
    );
  }

  return value;
}

function positiveInteger(
  name: string,
  defaultValue: number,
): number {
  const raw = process.env[name];

  if (!raw) {
    return defaultValue;
  }

  const value = Number(raw);

  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `Environment variable "${name}" must be a positive integer.`,
    );
  }

  return value;
}

export function loadAgentEnvironment(): AgentEnvironment {
  const apiUrl = required(
    'WINAUT_API_URL',
  ).replace(/\/+$/, '');

  return {
    apiUrl,

    token: required(
      'WINAUT_AGENT_TOKEN',
    ),

    version:
      process.env.WINAUT_AGENT_VERSION?.trim() ||
      'dev',

    heartbeatIntervalMs: positiveInteger(
      'WINAUT_AGENT_HEARTBEAT_INTERVAL_MS',
      30_000,
    ),

    requestTimeoutMs: positiveInteger(
      'WINAUT_AGENT_REQUEST_TIMEOUT_MS',
      10_000,
    ),

    jobLoopEnabled:
      process.env.WINAUT_AGENT_JOB_LOOP_ENABLED ===
      'true',
  };
}