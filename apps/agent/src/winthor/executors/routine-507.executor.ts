import type { AgentJobPayload } from '@winaut/contracts';

import type { WinThorSession } from '../sessions/winthor-session.interface.js';
import {
  InvalidWinThorRoutinePayloadError,
  WinThorRoutineExecutionNotImplementedError,
} from './winthor-routine-executor.errors.js';
import type { WinThorRoutineExecutor } from './winthor-routine-executor.interface.js';

const ROUTINE_507_ACTIONS = new Set([
  'RECALCULATE_MERCHANDISE_TURNOVER',
  'RECALCULATE_DAILY_TURNOVER',
  'RECALCULATE_SALE_PRICE',
]);

export class Routine507Executor implements WinThorRoutineExecutor {
  async execute(
    _session: WinThorSession,
    payload: AgentJobPayload,
  ): Promise<Record<string, unknown> | undefined> {
    if (payload.routine !== 507) {
      throw new InvalidWinThorRoutinePayloadError(
        507,
        'field "routine" must be 507.',
      );
    }

    const action = payload.action;

    if (
      typeof action !== 'string' ||
      !ROUTINE_507_ACTIONS.has(action)
    ) {
      throw new InvalidWinThorRoutinePayloadError(
        507,
        'field "action" is missing or unsupported.',
      );
    }

    throw new WinThorRoutineExecutionNotImplementedError(
      507,
      `action ${action}`,
    );
  }
}
