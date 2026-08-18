export type AgentJobPayload = Record<string, unknown>;

export interface AgentJob {
  id: string;
  runId: string;
  code: string;
  name: string;
  sequenceNumber: number;
  payload: AgentJobPayload | null;
  claimToken: string;
  leaseExpiresAt: string;
  attemptCount: number;
  run: {
    id: string;
    automationCode: string;
    winthorInstanceId: string;
    status: string;
  };
}

export interface AgentJobClaimResponse {
  job: AgentJob | null;
}
