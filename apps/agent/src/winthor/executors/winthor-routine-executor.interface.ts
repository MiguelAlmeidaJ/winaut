import type { AgentJobPayload } from '@winaut/contracts';

import type { WinThorSession } from '../sessions/winthor-session.interface.js';

export interface WinThorRoutineExecutor {
  execute(
    session: WinThorSession,
    payload: AgentJobPayload,
  ): Promise<Record<string, unknown> | undefined>;
}
