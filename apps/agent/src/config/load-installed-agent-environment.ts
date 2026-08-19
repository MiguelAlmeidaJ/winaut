import {
  loadAgentEnvironment,
  type AgentEnvironment,
} from './agent-env.js';
import type { AgentInstallationStore } from './agent-installation-store.interface.js';
import { PowerShellDpapiAgentInstallationStore } from './powershell-dpapi-agent-installation.store.js';

export async function loadInstalledAgentEnvironment(
  store: AgentInstallationStore =
    new PowerShellDpapiAgentInstallationStore(),
): Promise<AgentEnvironment> {
  const installation = await store.load();

  if (installation) {
    process.env.WINAUT_API_URL ??= installation.apiUrl;
    process.env.WINAUT_AGENT_TOKEN ??= installation.token;
  }

  return loadAgentEnvironment();
}
