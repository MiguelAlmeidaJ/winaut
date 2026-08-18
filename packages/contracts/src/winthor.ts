export const WinThorHostingType = {
  ON_PREMISE: 'ON_PREMISE',
  TOTVS_CLOUD: 'TOTVS_CLOUD',
  OTHER: 'OTHER',
} as const;

export type WinThorHostingType =
  (typeof WinThorHostingType)[keyof typeof WinThorHostingType];

export const WinThorExecutionMode = {
  LOCAL_WINDOWS: 'LOCAL_WINDOWS',
  GO_GLOBAL: 'GO_GLOBAL',
  RDP: 'RDP',
  CITRIX: 'CITRIX',
  API: 'API',
} as const;

export type WinThorExecutionMode =
  (typeof WinThorExecutionMode)[keyof typeof WinThorExecutionMode];

export interface WinThorConnectionProfile {
  id: string;
  type: WinThorExecutionMode;
  endpoint: string | null;
  applicationName: string | null;
  username: string | null;
  secretReference: string | null;
}

export interface AgentConfig {
  agent: {
    id: string;
    name: string;
    hostname: string;
    version: string | null;
  };
  winthorInstance: {
    id: string;
    name: string;
    hostingType: WinThorHostingType;
    executionMode: WinThorExecutionMode;
    timeZone: string;
  };
  accessProfile: WinThorConnectionProfile | null;
}
