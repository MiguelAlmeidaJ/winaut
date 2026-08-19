import type { AgentJob } from '@winaut/contracts';

export interface AgentJobHandler {
  execute(
    job: AgentJob,
    signal: AbortSignal,
  ): Promise<Record<string, unknown> | undefined>;
}
