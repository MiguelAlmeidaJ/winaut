import type { AgentJob } from '@winaut/contracts';

export interface AgentJobHandler {
  execute(job: AgentJob): Promise<Record<string, unknown> | undefined>;
}
