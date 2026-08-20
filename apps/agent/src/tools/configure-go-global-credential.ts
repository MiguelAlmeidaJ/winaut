import 'dotenv/config';

import { WinThorExecutionMode } from '@winaut/contracts';

import { AgentApiClient } from '../communication/agent-api-client.js';
import { loadInstalledAgentEnvironment } from '../config/load-installed-agent-environment.js';
import {
  PowerShellWindowsCredentialProvisioner,
  windowsCredentialTarget,
} from '../winthor/credentials/powershell-windows-credential.provisioner.js';

async function main(): Promise<void> {
  const environment = await loadInstalledAgentEnvironment(
    undefined,
    { preferInstalledCredentials: true },
  );
  const apiClient = new AgentApiClient({
    apiUrl: environment.apiUrl,
    token: environment.token,
    requestTimeoutMs: environment.requestTimeoutMs,
  });

  console.log('[GO_GLOBAL Credential] Loading Agent configuration...');
  const config = await apiClient.getConfig();

  if (
    config.winthorInstance.executionMode !== WinThorExecutionMode.GO_GLOBAL
  ) {
    throw new Error(
      `Este Agent está associado a um ambiente ${config.winthorInstance.executionMode}, não GO_GLOBAL.`,
    );
  }

  const profile = config.accessProfile;

  if (!profile || profile.type !== WinThorExecutionMode.GO_GLOBAL) {
    throw new Error(
      'Nenhum perfil GO_GLOBAL ativo foi encontrado. Configure o perfil no painel Orquestra antes de continuar.',
    );
  }

  const reference = profile.secretReference?.trim();

  if (!reference) {
    throw new Error(
      'O perfil GO_GLOBAL não possui Secret reference. Use o formato windows-credential:<target>.',
    );
  }

  const target = windowsCredentialTarget(reference);

  console.log(`[GO_GLOBAL Credential] Ambiente: ${config.winthorInstance.name}`);
  console.log(
    `[GO_GLOBAL Credential] Host Address: ${profile.endpoint ?? '(não configurado)'}`,
  );
  console.log(`[GO_GLOBAL Credential] Target: ${target}`);
  console.log(
    '[GO_GLOBAL Credential] A senha não será enviada para a API nem gravada em arquivo.',
  );

  const provisioner = new PowerShellWindowsCredentialProvisioner();
  await provisioner.provision(reference, profile.username);

  console.log('[GO_GLOBAL Credential] Credencial configurada.');
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[GO_GLOBAL Credential] Falha: ${message}`);
  process.exitCode = 1;
});
