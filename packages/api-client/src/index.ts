import type {
  AgentCredentialListItem,
  AgentListItem,
  CreateAgentCredentialResponse,
  CreateAgentInput,
  CreateAgentResponse,
  AutomationScheduleListItem,
  CreateAutomationScheduleInput,
  UpdateAutomationScheduleInput,
  AutomationRunDetail,
  AutomationRunFilters,
  AutomationRunListItem,
  CompanyListItem,
  HealthResponse,
  RevokeAgentCredentialResponse,
  WinThorInstanceDetail,
  WinThorInstanceListItem,
} from '@winaut/contracts';

interface ApiClientOptions {
  baseUrl: string;
}

interface ApiErrorPayload {
  code?: string;
  message?: string | string[];
}

export class WinAutApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'WinAutApiError';
  }
}

export interface WinAutApiClient {
  getHealth(): Promise<HealthResponse>;
  getCompanies(): Promise<CompanyListItem[]>;
  getWinThorInstances(): Promise<WinThorInstanceListItem[]>;
  getWinThorInstance(id: string): Promise<WinThorInstanceDetail>;
  getAgents(): Promise<AgentListItem[]>;
  createAgent(input: CreateAgentInput): Promise<CreateAgentResponse>;
  getAgent(id: string): Promise<AgentListItem>;
  getAgentCredentials(id: string): Promise<AgentCredentialListItem[]>;
  createAgentCredential(id: string): Promise<CreateAgentCredentialResponse>;
  revokeAgentCredential(
    agentId: string,
    credentialId: string,
  ): Promise<RevokeAgentCredentialResponse>;
  getAutomationSchedules(): Promise<AutomationScheduleListItem[]>;
  createAutomationSchedule(
    input: CreateAutomationScheduleInput,
  ): Promise<AutomationScheduleListItem>;
  updateAutomationSchedule(
    id: string,
    input: UpdateAutomationScheduleInput,
  ): Promise<AutomationScheduleListItem>;
  triggerAutomationSchedule(id: string): Promise<AutomationRunDetail>;
  getAutomationRuns(
    filters?: AutomationRunFilters,
  ): Promise<AutomationRunListItem[]>;
  getAutomationRun(id: string): Promise<AutomationRunDetail>;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseErrorPayload(value: unknown): ApiErrorPayload {
  if (!isRecord(value)) {
    return {};
  }

  const code = typeof value.code === 'string' ? value.code : undefined;
  const message =
    typeof value.message === 'string' ||
    (Array.isArray(value.message) &&
      value.message.every((item) => typeof item === 'string'))
      ? (value.message as string | string[])
      : undefined;

  return { code, message };
}

function errorMessage(payload: ApiErrorPayload, status: number): string {
  if (Array.isArray(payload.message)) {
    return payload.message.join(' ');
  }

  if (payload.message) {
    return payload.message;
  }

  if (status === 409) {
    return 'A operação entrou em conflito com um registro existente.';
  }

  if (status >= 500) {
    return 'A API do WinAut encontrou um erro ao processar a solicitação.';
  }

  return 'Não foi possível concluir a solicitação.';
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

export function createWinAutApiClient(
  options: ApiClientOptions,
): WinAutApiClient {
  const baseUrl = normalizeBaseUrl(options.baseUrl);

  async function request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          ...(options.body === undefined
            ? {}
            : { 'Content-Type': 'application/json' }),
        },
        body:
          options.body === undefined
            ? undefined
            : JSON.stringify(options.body),
      });
    } catch {
      throw new WinAutApiError(
        'Não foi possível conectar à API do WinAut.',
        0,
      );
    }

    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const payload = parseErrorPayload(body);
      throw new WinAutApiError(
        errorMessage(payload, response.status),
        response.status,
        payload.code,
      );
    }

    return body as T;
  }

  return {
    getHealth: () => request<HealthResponse>('/api/health'),
    getCompanies: () => request<CompanyListItem[]>('/api/companies'),
    getWinThorInstances: () =>
      request<WinThorInstanceListItem[]>('/api/winthor-instances'),
    getWinThorInstance: (id) =>
      request<WinThorInstanceDetail>(`/api/winthor-instances/${encodeURIComponent(id)}`),
    getAgents: () => request<AgentListItem[]>('/api/agents'),
    createAgent: (input) =>
      request<CreateAgentResponse>('/api/agents', {
        method: 'POST',
        body: input,
      }),
    getAgent: (id) =>
      request<AgentListItem>(`/api/agents/${encodeURIComponent(id)}`),
    getAgentCredentials: (id) =>
      request<AgentCredentialListItem[]>(
        `/api/agents/${encodeURIComponent(id)}/credentials`,
      ),
    createAgentCredential: (id) =>
      request<CreateAgentCredentialResponse>(
        `/api/agents/${encodeURIComponent(id)}/credentials`,
        { method: 'POST' },
      ),
    revokeAgentCredential: (agentId, credentialId) =>
      request<RevokeAgentCredentialResponse>(
        `/api/agents/${encodeURIComponent(agentId)}/credentials/${encodeURIComponent(credentialId)}`,
        { method: 'DELETE' },
      ),
    getAutomationSchedules: () =>
      request<AutomationScheduleListItem[]>('/api/automation-schedules'),
    createAutomationSchedule: (input) =>
      request<AutomationScheduleListItem>('/api/automation-schedules', {
        method: 'POST',
        body: input,
      }),
    updateAutomationSchedule: (id, input) =>
      request<AutomationScheduleListItem>(
        `/api/automation-schedules/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: input,
        },
      ),
    triggerAutomationSchedule: (id) =>
      request<AutomationRunDetail>(
        `/api/automation-schedules/${encodeURIComponent(id)}/trigger`,
        { method: 'POST' },
      ),
    getAutomationRuns: (filters = {}) => {
      const search = new URLSearchParams();

      if (filters.companyId) {
        search.set('companyId', filters.companyId);
      }
      if (filters.winthorInstanceId) {
        search.set('winthorInstanceId', filters.winthorInstanceId);
      }
      if (filters.automationCode) {
        search.set('automationCode', filters.automationCode);
      }
      if (filters.status) {
        search.set('status', filters.status);
      }
      if (filters.from) {
        search.set('from', filters.from);
      }
      if (filters.to) {
        search.set('to', filters.to);
      }
      if (filters.limit !== undefined) {
        search.set('limit', String(filters.limit));
      }

      const query = search.toString();

      return request<AutomationRunListItem[]>(
        `/api/automation-runs${query ? `?${query}` : ''}`,
      );
    },
    getAutomationRun: (id) =>
      request<AutomationRunDetail>(
        `/api/automation-runs/${encodeURIComponent(id)}`,
      ),
  };
}
