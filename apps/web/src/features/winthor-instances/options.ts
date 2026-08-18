import type {
  WinThorExecutionMode,
  WinThorHostingType,
} from '@winaut/contracts';

export const hostingTypeOptions = [
  { value: 'ON_PREMISE', label: 'On-premise' },
  { value: 'TOTVS_CLOUD', label: 'TOTVS Cloud' },
  { value: 'OTHER', label: 'Outro' },
] satisfies readonly { value: WinThorHostingType; label: string }[];

export const executionModeOptions = [
  { value: 'LOCAL_WINDOWS', label: 'Windows local' },
  { value: 'GO_GLOBAL', label: 'Go-Global' },
  { value: 'RDP', label: 'RDP' },
  { value: 'CITRIX', label: 'Citrix' },
  { value: 'API', label: 'API' },
] satisfies readonly { value: WinThorExecutionMode; label: string }[];
