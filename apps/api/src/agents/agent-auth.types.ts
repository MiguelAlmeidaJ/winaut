import type { AgentStatus } from '../generated/prisma/client';

export interface AuthenticatedAgent {
  id: string;
  winthorInstanceId: string;
  name: string;
  hostname: string;
  version: string | null;
  status: AgentStatus;
  enabled: boolean;
}
