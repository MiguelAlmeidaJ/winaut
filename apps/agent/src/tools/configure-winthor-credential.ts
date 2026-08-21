import 'dotenv/config';

import { WinThorExecutionMode } from '@winaut/contracts';

import { AgentApiClient } from '../communication/agent-api-client.js';
import { loadInstalledAgentEnvironment } from '../config/load-installed-agent-environment.js';
import {
  PowerShellWindowsCredentialProvisioner,
  winThorApplicationCredentialReference,
  windowsCredentialTarget,
} from '../winthor/credentials/powershell-windows-credential.provisioner.js';

async function main(): Promise<void> {
  const environment = await loadInstalledAgentEnvironment(undefined, {
    preferInstalledCredentials: true,
  });
  const apiClient = new AgentApiClient({
    apiUrl: environment.apiUrl,
    token: environment.token,
    requestTimeoutMs: environment.requestTimeoutMs,
  });

  console.log('[WinThor Credential] Loading Agent configuration...');
  const config = await apiClient.getConfig();

  if (
    config.winthorInstance.executionMode !== WinThorExecutionMode.GO_GLOBAL
  ) {
    throw new Error(
      `Este Agent está associado a um ambiente ${config.winthorInstance.executionMode}, não GO_GLOBAL.`,
    );
  }

  const goGlobalReference = config.accessProfile?.secretReference?.trim();

  if (!goGlobalReference) {
    throw new Error(
      'Configure primeiro a referência da credencial GO-Global.',
    );
  }

  const reference =
    winThorApplicationCredentialReference(goGlobalReference);

  console.log(`[WinThor Credential] Ambiente: ${config.winthorInstance.name}`);
  console.log(
    `[WinThor Credential] Target: ${windowsCredentialTarget(reference)}`,
  );
  console.log(
    '[WinThor Credential] Informe o usuário e a senha da tela interna do WinThor. A senha não será enviada para a API nem gravada em arquivo.',
  );

  await new PowerShellWindowsCredentialProvisioner().provision(
    reference,
    null,
  );

  console.log('[WinThor Credential] Credencial configurada.');
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[WinThor Credential] Falha: ${message}`);
  process.exitCode = 1;
});
