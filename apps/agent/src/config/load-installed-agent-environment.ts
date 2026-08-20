import {
  loadAgentEnvironment,
  type AgentEnvironment,
} from './agent-env.js';
import type { AgentInstallationStore } from './agent-installation-store.interface.js';
import { PowerShellDpapiAgentInstallationStore } from './powershell-dpapi-agent-installation.store.js';

interface LoadInstalledAgentEnvironmentOptions {
  preferInstalledCredentials?: boolean;
}

export async function loadInstalledAgentEnvironment(
  store: AgentInstallationStore =
    new PowerShellDpapiAgentInstallationStore(),
  options: LoadInstalledAgentEnvironmentOptions = {},
): Promise<AgentEnvironment> {
  const installation = await store.load();

  if (installation) {
    if (options.preferInstalledCredentials) {
      process.env.WINAUT_API_URL = installation.apiUrl;
      process.env.WINAUT_AGENT_TOKEN = installation.token;
    } else {
      process.env.WINAUT_API_URL ??= installation.apiUrl;
      process.env.WINAUT_AGENT_TOKEN ??= installation.token;
    }
  }

  return loadAgentEnvironment();
}
