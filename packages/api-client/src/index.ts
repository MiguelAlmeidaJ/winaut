import type {
  AdminSessionResponse,
  AdminUser,
  CreateWinThorBranchInput,
  AgentCredentialListItem,
  AgentListItem,
  LoginInput,
  LogoutResponse,
  Routine507Configuration,
  Routine507ConfigurationView,
  Routine507PreviewResponse,
  UpdateWinThorBranchInput,
  CompanyDetail,
  CompanyReference,
  CreateCompanyInput,
  CreateAgentCredentialResponse,
  CreateAgentInput,
  CreateAgentResponse,
  UpdateAgentInput,
  CreateWinThorAccessProfileInput,
  CreateWinThorInstanceInput,
  UpdateWinThorAccessProfileInput,
  UpdateWinThorInstanceInput,
  AutomationScheduleListItem,
  CreateAutomationScheduleInput,
  UpdateAutomationScheduleInput,
  AutomationRunDetail,
  AutomationRunFilters,
  AutomationRunListItem,
  CompanyListItem,
  HealthResponse,
  RevokeAgentCredentialResponse,
  WinThorAccessProfileItem,
  WinThorBranchItem,
  WinThorInstanceDetail,
  WinThorInstanceListItem,
  WinThorInstanceMutationResult,
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
  login(input: LoginInput): Promise<AdminSessionResponse>;
  logout(): Promise<LogoutResponse>;
  getCurrentAdmin(): Promise<AdminUser>;
  getWinThorBranches(winthorInstanceId?: string): Promise<WinThorBranchItem[]>;
  createWinThorBranch(input: CreateWinThorBranchInput): Promise<WinThorBranchItem>;
  updateWinThorBranch(
    id: string,
    input: UpdateWinThorBranchInput,
  ): Promise<WinThorBranchItem>;
  getRoutine507Configuration(
    winthorInstanceId: string,
  ): Promise<Routine507ConfigurationView>;
  saveRoutine507Configuration(
    winthorInstanceId: string,
    input: Routine507Configuration,
  ): Promise<Routine507ConfigurationView>;
  previewRoutine507Configuration(
    winthorInstanceId: string,
    input: Routine507Configuration,
  ): Promise<Routine507PreviewResponse>;
  resetRoutine507Configuration(
    winthorInstanceId: string,
  ): Promise<Routine507ConfigurationView>;
  getHealth(): Promise<HealthResponse>;
  getCompanies(): Promise<CompanyListItem[]>;
  createCompany(input: CreateCompanyInput): Promise<CompanyReference>;
  getCompany(id: string): Promise<CompanyDetail>;
  getWinThorInstances(): Promise<WinThorInstanceListItem[]>;
  getWinThorInstance(id: string): Promise<WinThorInstanceDetail>;
  createWinThorInstance(
    input: CreateWinThorInstanceInput,
  ): Promise<WinThorInstanceMutationResult>;
  updateWinThorInstance(
    id: string,
    input: UpdateWinThorInstanceInput,
  ): Promise<WinThorInstanceMutationResult>;
  createWinThorAccessProfile(
    input: CreateWinThorAccessProfileInput,
  ): Promise<WinThorAccessProfileItem>;
  updateWinThorAccessProfile(
    id: string,
    input: UpdateWinThorAccessProfileInput,
  ): Promise<WinThorAccessProfileItem>;
  getAgents(): Promise<AgentListItem[]>;
  createAgent(input: CreateAgentInput): Promise<CreateAgentResponse>;
  getAgent(id: string): Promise<AgentListItem>;
  updateAgent(id: string, input: UpdateAgentInput): Promise<AgentListItem>;
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
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
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
        credentials: 'include',
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
    login: (input) =>
      request<AdminSessionResponse>('/api/auth/login', {
        method: 'POST',
        body: input,
      }),
    logout: () =>
      request<LogoutResponse>('/api/auth/logout', {
        method: 'POST',
      }),
    getCurrentAdmin: () => request<AdminUser>('/api/auth/me'),
    getWinThorBranches: (winthorInstanceId) => {
      const search = new URLSearchParams();
      if (winthorInstanceId) {
        search.set('winthorInstanceId', winthorInstanceId);
      }
      const query = search.toString();
      return request<WinThorBranchItem[]>(
        `/api/winthor-branches${query ? `?${query}` : ''}`,
      );
    },
    createWinThorBranch: (input) =>
      request<WinThorBranchItem>('/api/winthor-branches', {
        method: 'POST',
        body: input,
      }),
    updateWinThorBranch: (id, input) =>
      request<WinThorBranchItem>(
        `/api/winthor-branches/${encodeURIComponent(id)}`,
        { method: 'PATCH', body: input },
      ),
    getRoutine507Configuration: (winthorInstanceId) =>
      request<Routine507ConfigurationView>(
        `/api/automation-configurations/${encodeURIComponent(winthorInstanceId)}/507`,
      ),
    saveRoutine507Configuration: (winthorInstanceId, input) =>
      request<Routine507ConfigurationView>(
        `/api/automation-configurations/${encodeURIComponent(winthorInstanceId)}/507`,
        { method: 'PUT', body: input },
      ),
    previewRoutine507Configuration: (winthorInstanceId, input) =>
      request<Routine507PreviewResponse>(
        `/api/automation-configurations/${encodeURIComponent(winthorInstanceId)}/507/preview`,
        { method: 'POST', body: input },
      ),
    resetRoutine507Configuration: (winthorInstanceId) =>
      request<Routine507ConfigurationView>(
        `/api/automation-configurations/${encodeURIComponent(winthorInstanceId)}/507`,
        { method: 'DELETE' },
      ),
    getHealth: () => request<HealthResponse>('/api/health'),
    getCompanies: () => request<CompanyListItem[]>('/api/companies'),
    createCompany: (input) =>
      request<CompanyReference>('/api/companies', {
        method: 'POST',
        body: input,
      }),
    getCompany: (id) =>
      request<CompanyDetail>(`/api/companies/${encodeURIComponent(id)}`),
    getWinThorInstances: () =>
      request<WinThorInstanceListItem[]>('/api/winthor-instances'),
    getWinThorInstance: (id) =>
      request<WinThorInstanceDetail>(`/api/winthor-instances/${encodeURIComponent(id)}`),
    createWinThorInstance: (input) =>
      request<WinThorInstanceMutationResult>('/api/winthor-instances', {
        method: 'POST',
        body: input,
      }),
    updateWinThorInstance: (id, input) =>
      request<WinThorInstanceMutationResult>(
        `/api/winthor-instances/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: input,
        },
      ),
    createWinThorAccessProfile: (input) =>
      request<WinThorAccessProfileItem>('/api/winthor-access-profiles', {
        method: 'POST',
        body: input,
      }),
    updateWinThorAccessProfile: (id, input) =>
      request<WinThorAccessProfileItem>(
        `/api/winthor-access-profiles/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: input,
        },
      ),
    getAgents: () => request<AgentListItem[]>('/api/agents'),
    createAgent: (input) =>
      request<CreateAgentResponse>('/api/agents', {
        method: 'POST',
        body: input,
      }),
    getAgent: (id) =>
      request<AgentListItem>(`/api/agents/${encodeURIComponent(id)}`),
    updateAgent: (id, input) =>
      request<AgentListItem>(
        `/api/agents/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: input,
        },
      ),
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
