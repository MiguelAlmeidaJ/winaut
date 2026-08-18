import type {
  WinThorExecutionMode,
  WinThorHostingType,
} from '@winaut/contracts';

const hostingTypeLabels = {
  ON_PREMISE: 'On-premise',
  TOTVS_CLOUD: 'TOTVS Cloud',
  OTHER: 'Outro',
} satisfies Record<WinThorHostingType, string>;

const executionModeLabels = {
  LOCAL_WINDOWS: 'Windows local',
  GO_GLOBAL: 'Go-Global',
  RDP: 'RDP',
  CITRIX: 'Citrix',
  API: 'API',
} satisfies Record<WinThorExecutionMode, string>;

export function formatHostingType(value: WinThorHostingType): string {
  return hostingTypeLabels[value];
}

export function formatExecutionMode(value: WinThorExecutionMode): string {
  return executionModeLabels[value];
}
