import { AgentApiError } from '../communication/agent-api.errors.js';

export interface EnrollAgentInput {
  activationCode: string;
  hostname: string;
  version: string;
}

export interface EnrollAgentResponse {
  agent: {
    id: string;
    name: string;
    winthorInstanceId: string;
  };
  credential: {
    token: string;
  };
}

interface AgentEnrollmentApiClientOptions {
  apiUrl: string;
  requestTimeoutMs: number;
}

export class AgentEnrollmentApiClient {
  private readonly apiUrl: string;
  private readonly requestTimeoutMs: number;

  constructor(options: AgentEnrollmentApiClientOptions) {
    this.apiUrl = options.apiUrl.trim().replace(/\/+$/, '');
    this.requestTimeoutMs = options.requestTimeoutMs;
  }

  async enroll(input: EnrollAgentInput): Promise<EnrollAgentResponse> {
    const response = await fetch(`${this.apiUrl}/api/agents/enroll`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(this.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new AgentApiError(response.status, await response.text());
    }

    return (await response.json()) as EnrollAgentResponse;
  }
}
