import type {
  AgentConfig,
  AgentJobClaimResponse,
  WinThorExecutionMode,
} from '@winaut/contracts';

export interface AgentHeartbeatInput {
  hostname: string;
  version: string;
  capabilities?: WinThorExecutionMode[];
}

export interface AgentApiClient {
  getConfig(): Promise<AgentConfig>;
  heartbeat(input: AgentHeartbeatInput): Promise<void>;
  claimJob(): Promise<AgentJobClaimResponse>;
  heartbeatJob(stepId: string, claimToken: string): Promise<void>;
  succeedJob(
    stepId: string,
    claimToken: string,
    result?: Record<string, unknown>,
  ): Promise<void>;
  failJob(
    stepId: string,
    claimToken: string,
    errorCode: string,
    errorMessage: string,
  ): Promise<void>;
}
