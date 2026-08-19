import 'dotenv/config';

import { readFile, rm } from 'node:fs/promises';
import { hostname } from 'node:os';

import { PowerShellDpapiAgentInstallationStore } from '../config/powershell-dpapi-agent-installation.store.js';
import { AgentEnrollmentApiClient } from './agent-enrollment-api-client.js';

interface EnrollmentArguments {
  apiUrl: string;
  activationCode: string;
}

function requiredArgument(index: number, label: string): string {
  const value = process.argv[index]?.trim();

  if (!value) {
    throw new Error(
      `Missing ${label}. Usage: pnpm --filter @winaut/agent enroll -- <api-url> <activation-code>`,
    );
  }

  return value;
}

async function loadEnrollmentArguments(): Promise<EnrollmentArguments> {
  if (process.argv[2] !== '--input-file') {
    return {
      apiUrl: requiredArgument(2, 'API URL'),
      activationCode: requiredArgument(3, 'activation code'),
    };
  }

  const inputPath = requiredArgument(3, 'enrollment input file');

  try {
    const input = JSON.parse(await readFile(inputPath, 'utf8')) as Partial<EnrollmentArguments>;
    if (!input.apiUrl?.trim() || !input.activationCode?.trim()) {
      throw new Error('Enrollment input file must contain apiUrl and activationCode.');
    }

    return {
      apiUrl: input.apiUrl.trim(),
      activationCode: input.activationCode.trim(),
    };
  } finally {
    await rm(inputPath, { force: true });
  }
}

async function main(): Promise<void> {
  const enrollment = await loadEnrollmentArguments();
  const apiUrl = enrollment.apiUrl.replace(/\/+$/, '');
  const activationCode = enrollment.activationCode;
  const version = process.env.WINAUT_AGENT_VERSION?.trim() || '0.1.0';
  const requestTimeoutMs = Number(
    process.env.WINAUT_AGENT_REQUEST_TIMEOUT_MS ?? 10_000,
  );

  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs <= 0) {
    throw new Error(
      'WINAUT_AGENT_REQUEST_TIMEOUT_MS must be a positive integer.',
    );
  }

  console.log('[Enrollment] Linking this machine to Orquestra...');

  const client = new AgentEnrollmentApiClient({
    apiUrl,
    requestTimeoutMs,
  });
  const response = await client.enroll({
    activationCode,
    hostname: hostname(),
    version,
  });

  const store = new PowerShellDpapiAgentInstallationStore();
  await store.save({
    apiUrl,
    token: response.credential.token,
  });

  console.log(`[Enrollment] Agent linked: ${response.agent.name}`);
  console.log(`[Enrollment] Agent ID: ${response.agent.id}`);
  console.log('[Enrollment] Credential stored securely with Windows DPAPI.');
  console.log('[Enrollment] You can now start the Agent without WINAUT_AGENT_TOKEN.');
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[Enrollment] Failed: ${message}`);
  console.error(
    '[Enrollment] If the activation code was already consumed, generate a new code in Orquestra and retry.',
  );
  process.exitCode = 1;
});
