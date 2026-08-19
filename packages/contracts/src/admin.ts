import type { WinThorExecutionMode, WinThorHostingType } from './winthor.js';

export type DateTimeString = string;

export const AdminRole = {
  ADMIN: 'ADMIN',
} as const;

export type AdminRole = (typeof AdminRole)[keyof typeof AdminRole];

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  lastLoginAt: DateTimeString | null;
  createdAt: DateTimeString;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AdminSessionResponse {
  user: AdminUser;
}

export interface LogoutResponse {
  status: 'ok';
}

export const AgentStatus = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  DISABLED: 'DISABLED',
} as const;

export type AgentStatus = (typeof AgentStatus)[keyof typeof AgentStatus];

export interface CompanyReference {
  id: string;
  name: string;
  document: string | null;
  active: boolean;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export interface CompanyListItem extends CompanyReference {
  _count: {
    winthorInstances: number;
  };
}

export interface CreateCompanyInput {
  name: string;
  document?: string;
  active?: boolean;
}

export interface CompanyWinThorInstanceItem {
  id: string;
  companyId: string;
  name: string;
  active: boolean;
  timeZone: string;
  hostingType: WinThorHostingType;
  executionMode: WinThorExecutionMode;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export interface CompanyDetail extends CompanyReference {
  winthorInstances: CompanyWinThorInstanceItem[];
}

export interface WinThorInstanceListItem {
  id: string;
  companyId: string;
  name: string;
  active: boolean;
  timeZone: string;
  hostingType: WinThorHostingType;
  executionMode: WinThorExecutionMode;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
  company: CompanyReference;
  _count: {
    accessProfiles: number;
    agents: number;
    schedules: number;
    runs: number;
  };
}

export interface CreateWinThorInstanceInput {
  companyId: string;
  name: string;
  active?: boolean;
  timeZone: string;
  hostingType: WinThorHostingType;
  executionMode: WinThorExecutionMode;
}

export interface UpdateWinThorInstanceInput {
  name?: string;
  active?: boolean;
  timeZone?: string;
  hostingType?: WinThorHostingType;
  executionMode?: WinThorExecutionMode;
}

export type WinThorInstanceMutationResult = Omit<
  WinThorInstanceListItem,
  '_count'
>;


export interface WinThorAccessProfileItem {
  id: string;
  winthorInstanceId: string;
  type: WinThorExecutionMode;
  endpoint: string | null;
  applicationName: string | null;
  username: string | null;
  secretReference: string | null;
  enabled: boolean;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export interface CreateWinThorAccessProfileInput {
  winthorInstanceId: string;
  type: WinThorExecutionMode;
  endpoint?: string;
  applicationName?: string;
  username?: string;
  secretReference?: string;
  enabled?: boolean;
}

export interface UpdateWinThorAccessProfileInput {
  type?: WinThorExecutionMode;
  endpoint?: string | null;
  applicationName?: string | null;
  username?: string | null;
  secretReference?: string | null;
  enabled?: boolean;
}

export interface WinThorInstanceAgentItem {
  id: string;
  winthorInstanceId: string;
  name: string;
  hostname: string;
  version: string | null;
  status: AgentStatus;
  lastSeenAt: DateTimeString | null;
  registeredAt: DateTimeString;
  enabled: boolean;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export interface WinThorInstanceScheduleItem {
  id: string;
  winthorInstanceId: string;
  automationCode: string;
  name: string;
  enabled: boolean;
  timeZone: string;
  cronExpression: string;
  nextRunAt: DateTimeString;
  lastRunAt: DateTimeString | null;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export interface WinThorInstanceDetail
  extends Omit<WinThorInstanceListItem, '_count'> {
  accessProfiles: WinThorAccessProfileItem[];
  agents: WinThorInstanceAgentItem[];
  schedules: WinThorInstanceScheduleItem[];
}

export interface AgentCredentialListItem {
  id: string;
  createdAt: DateTimeString;
  lastUsedAt: DateTimeString | null;
  revokedAt: DateTimeString | null;
}

export interface AgentListItem {
  id: string;
  winthorInstanceId: string;
  name: string;
  hostname: string;
  version: string | null;
  status: AgentStatus;
  lastSeenAt: DateTimeString | null;
  registeredAt: DateTimeString;
  enabled: boolean;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
  online: boolean;
  winthorInstance: Omit<WinThorInstanceListItem, '_count' | 'company'> & {
    company: CompanyReference;
  };
}


export interface CreateAgentInput {
  winthorInstanceId: string;
  name: string;
  hostname: string;
  version?: string;
}

export interface UpdateAgentInput {
  enabled: boolean;
}

export interface CreateAgentResponse {
  agent: AgentListItem;
  credential: {
    token: string;
    warning: string;
  };
}

export interface AgentCredentialCreated {
  id: string;
  agentId: string;
  createdAt: DateTimeString;
}

export interface CreateAgentCredentialResponse {
  credential: AgentCredentialCreated;
  token: string;
  warning: string;
}

export interface RevokeAgentCredentialResponse {
  status: 'revoked';
  credentialId: string;
}


export interface CreateAutomationScheduleInput {
  winthorInstanceId: string;
  automationCode: string;
  name: string;
  enabled?: boolean;
  timeZone: string;
  cronExpression: string;
}

export interface UpdateAutomationScheduleInput {
  name?: string;
  enabled?: boolean;
  timeZone?: string;
  cronExpression?: string;
}

export interface AutomationScheduleListItem {
  id: string;
  winthorInstanceId: string;
  automationCode: string;
  name: string;
  enabled: boolean;
  timeZone: string;
  cronExpression: string;
  nextRunAt: DateTimeString;
  lastRunAt: DateTimeString | null;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
  winthorInstance: Omit<WinThorInstanceListItem, '_count' | 'company'> & {
    company: CompanyReference;
  };
}


export const AutomationRunStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type AutomationRunStatus =
  (typeof AutomationRunStatus)[keyof typeof AutomationRunStatus];

export const AutomationStepStatus = {
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
} as const;

export type AutomationStepStatus =
  (typeof AutomationStepStatus)[keyof typeof AutomationStepStatus];

export interface AutomationRunFilters {
  companyId?: string;
  winthorInstanceId?: string;
  automationCode?: string;
  status?: AutomationRunStatus;
  from?: DateTimeString;
  to?: DateTimeString;
  limit?: number;
}

export interface AutomationRunListItem {
  id: string;
  winthorInstanceId: string;
  scheduleId: string | null;
  automationCode: string;
  status: AutomationRunStatus;
  scheduledFor: DateTimeString | null;
  startedAt: DateTimeString | null;
  finishedAt: DateTimeString | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
  winthorInstance: Omit<WinThorInstanceListItem, '_count'>;
  schedule: {
    id: string;
    name: string;
  } | null;
}

export interface AutomationStepItem {
  id: string;
  runId: string;
  code: string;
  name: string;
  sequenceNumber: number;
  status: AutomationStepStatus;
  payload: unknown;
  result: unknown;
  claimedByAgentId: string | null;
  claimedAt: DateTimeString | null;
  leaseExpiresAt: DateTimeString | null;
  attemptCount: number;
  startedAt: DateTimeString | null;
  finishedAt: DateTimeString | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
  claimedByAgent: {
    id: string;
    name: string;
    hostname: string;
  } | null;
}

export interface AutomationRunDetail extends AutomationRunListItem {
  steps: AutomationStepItem[];
}

export interface HealthResponse {
  status: 'ok';
  services: {
    api: 'up';
    database: 'up';
  };
  timestamp: DateTimeString;
}
