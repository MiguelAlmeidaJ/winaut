import type { AgentJobPayload } from '@winaut/contracts';

import type { WinThorSession } from '../sessions/winthor-session.interface.js';
import {
  InvalidWinThorRoutinePayloadError,
  WinThorRoutineExecutionNotImplementedError,
} from './winthor-routine-executor.errors.js';
import type { WinThorRoutineExecutor } from './winthor-routine-executor.interface.js';

export class Routine552Executor implements WinThorRoutineExecutor {
  async execute(
    _session: WinThorSession,
    payload: AgentJobPayload,
  ): Promise<Record<string, unknown> | undefined> {
    if (payload.routine !== 552) {
      throw new InvalidWinThorRoutinePayloadError(
        552,
        'field "routine" must be 552.',
      );
    }

    if (payload.preserveExistingConfiguration !== true) {
      throw new InvalidWinThorRoutinePayloadError(
        552,
        'field "preserveExistingConfiguration" must be true.',
      );
    }

    throw new WinThorRoutineExecutionNotImplementedError(552);
  }
}
