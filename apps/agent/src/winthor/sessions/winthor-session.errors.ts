import type { WinThorExecutionMode } from '@winaut/contracts';

export class WinThorSessionNotImplementedError extends Error {
  readonly code = 'WINTHOR_SESSION_NOT_IMPLEMENTED';

  constructor(
    readonly executionMode: WinThorExecutionMode,
    readonly operation: string,
  ) {
    super(
      `Execution mode ${executionMode} is not implemented yet (${operation}).`,
    );
    this.name = WinThorSessionNotImplementedError.name;
  }
}

export class UnsupportedWinThorExecutionModeError extends Error {
  readonly code = 'WINTHOR_EXECUTION_MODE_UNSUPPORTED';

  constructor(readonly executionMode: string) {
    super(`Unsupported WinThor execution mode: ${executionMode}.`);
    this.name = UnsupportedWinThorExecutionModeError.name;
  }
}
