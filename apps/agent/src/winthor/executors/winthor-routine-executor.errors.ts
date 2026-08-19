export class UnsupportedWinThorAutomationError extends Error {
  constructor(public readonly automationCode: string) {
    super(
      `Automation ${automationCode} is not supported by this Orquestra Agent.`,
    );
    this.name = 'UnsupportedWinThorAutomationError';
  }
}

export class InvalidWinThorRoutinePayloadError extends Error {
  constructor(
    public readonly routineCode: number,
    message: string,
  ) {
    super(`Invalid payload for WinThor routine ${routineCode}: ${message}`);
    this.name = 'InvalidWinThorRoutinePayloadError';
  }
}

export class WinThorRoutineExecutionNotImplementedError extends Error {
  constructor(
    public readonly routineCode: number,
    detail?: string,
  ) {
    super(
      `WinThor routine ${routineCode} execution is not implemented yet${
        detail ? ` (${detail})` : ''
      }.`,
    );
    this.name = 'WinThorRoutineExecutionNotImplementedError';
  }
}
