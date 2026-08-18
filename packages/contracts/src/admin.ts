import type { WinThorExecutionMode, WinThorHostingType } from './winthor.js';

export type DateTimeString = string;

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

export interface HealthResponse {
  status: 'ok';
  services: {
    api: 'up';
    database: 'up';
  };
  timestamp: DateTimeString;
}
