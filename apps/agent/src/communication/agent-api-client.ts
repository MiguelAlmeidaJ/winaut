import type {
  AgentConfig,
} from '@winaut/contracts';

import { AgentApiError } from './agent-api.errors';

export interface AgentHeartbeatInput {
  hostname: string;
  version: string;
  capabilities?: string[];
}

interface AgentApiClientOptions {
  apiUrl: string;
  token: string;
  requestTimeoutMs: number;
}

export class AgentApiClient {
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly requestTimeoutMs: number;

  constructor(
    options: AgentApiClientOptions,
  ) {
    this.apiUrl =
      options.apiUrl.replace(/\/+$/, '');

    this.token = options.token;

    this.requestTimeoutMs =
      options.requestTimeoutMs;
  }

  getConfig(): Promise<AgentConfig> {
    return this.request<AgentConfig>(
      '/api/agents/me/config',
      {
        method: 'GET',
      },
    );
  }

  async heartbeat(
    input: AgentHeartbeatInput,
  ): Promise<void> {
    await this.request<unknown>(
      '/api/agents/me/heartbeat',
      {
        method: 'POST',

        body: JSON.stringify(input),
      },
    );
  }

  private async request<T>(
    path: string,
    init: RequestInit,
  ): Promise<T> {
    const response = await fetch(
      `${this.apiUrl}${path}`,
      {
        ...init,

        headers: {
          Accept: 'application/json',
          Authorization:
            `Bearer ${this.token}`,

          ...(init.body
            ? {
                'Content-Type':
                  'application/json',
              }
            : {}),

          ...init.headers,
        },

        signal: AbortSignal.timeout(
          this.requestTimeoutMs,
        ),
      },
    );

    if (!response.ok) {
      const responseBody =
        await response.text();

      throw new AgentApiError(
        response.status,
        responseBody,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();

    if (!text) {
      return undefined as T;
    }

    return JSON.parse(text) as T;
  }
}