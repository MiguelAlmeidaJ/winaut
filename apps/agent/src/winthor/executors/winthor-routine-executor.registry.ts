import { Routine507Executor } from './routine-507.executor.js';
import { Routine552Executor } from './routine-552.executor.js';
import { UnsupportedWinThorAutomationError } from './winthor-routine-executor.errors.js';
import type { WinThorRoutineExecutor } from './winthor-routine-executor.interface.js';

export interface WinThorRoutineExecutorResolver {
  get(automationCode: string): WinThorRoutineExecutor;
}

export class WinThorRoutineExecutorRegistry
  implements WinThorRoutineExecutorResolver
{
  private readonly executors: ReadonlyMap<string, WinThorRoutineExecutor>;

  constructor(
    executors: ReadonlyMap<string, WinThorRoutineExecutor> = new Map([
      ['507', new Routine507Executor()],
      ['552', new Routine552Executor()],
    ]),
  ) {
    this.executors = executors;
  }

  get(automationCode: string): WinThorRoutineExecutor {
    const executor = this.executors.get(automationCode);

    if (!executor) {
      throw new UnsupportedWinThorAutomationError(automationCode);
    }

    return executor;
  }
}
