import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import type {
  AgentInstallation,
  AgentInstallationStore,
} from './agent-installation-store.interface.js';
import { loadInstalledAgentEnvironment } from './load-installed-agent-environment.js';

const original = {
  apiUrl: process.env.WINAUT_API_URL,
  token: process.env.WINAUT_AGENT_TOKEN,
};

class FakeStore implements AgentInstallationStore {
  constructor(private readonly installation: AgentInstallation | null) {}

  load(): Promise<AgentInstallation | null> {
    return Promise.resolve(this.installation);
  }

  save(_installation: AgentInstallation): Promise<void> {
    return Promise.resolve();
  }
}

afterEach(() => {
  restore('WINAUT_API_URL', original.apiUrl);
  restore('WINAUT_AGENT_TOKEN', original.token);
});

describe('loadInstalledAgentEnvironment', () => {
  it('loads API URL and token from the secure installation store', async () => {
    delete process.env.WINAUT_API_URL;
    delete process.env.WINAUT_AGENT_TOKEN;

    const environment = await loadInstalledAgentEnvironment(
      new FakeStore({
        apiUrl: 'https://api.orquestra.example',
        token: 'stored-token',
      }),
    );

    assert.equal(environment.apiUrl, 'https://api.orquestra.example');
    assert.equal(environment.token, 'stored-token');
  });

  it('prefers the secure installation when explicitly requested', async () => {
    process.env.WINAUT_API_URL = 'http://localhost:3301';
    process.env.WINAUT_AGENT_TOKEN = 'stale-env-token';

    const environment = await loadInstalledAgentEnvironment(
      new FakeStore({
        apiUrl: 'https://api.orquestra.example',
        token: 'stored-token',
      }),
      { preferInstalledCredentials: true },
    );

    assert.equal(environment.apiUrl, 'https://api.orquestra.example');
    assert.equal(environment.token, 'stored-token');
  });

  it('keeps explicit environment variables as development overrides', async () => {
    process.env.WINAUT_API_URL = 'http://localhost:3301';
    process.env.WINAUT_AGENT_TOKEN = 'env-token';

    const environment = await loadInstalledAgentEnvironment(
      new FakeStore({
        apiUrl: 'https://api.orquestra.example',
        token: 'stored-token',
      }),
    );

    assert.equal(environment.apiUrl, 'http://localhost:3301');
    assert.equal(environment.token, 'env-token');
  });
});

function restore(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }

  process.env[name] = value;
}
