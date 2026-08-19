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

export class WinThorLocalSessionStateError extends Error {
  readonly code = 'WINTHOR_LOCAL_SESSION_STATE_INVALID';

  constructor(operation: string) {
    super(
      `LOCAL_WINDOWS session must be connected before ${operation}.`,
    );
    this.name = WinThorLocalSessionStateError.name;
  }
}

export class WinThorLocalEndpointNotConfiguredError extends Error {
  readonly code = 'WINTHOR_LOCAL_ENDPOINT_NOT_CONFIGURED';

  constructor(readonly windowTitle: string) {
    super(
      `No WinThor window matching "${windowTitle}" was found and the LOCAL_WINDOWS access profile has no launch target in endpoint.`,
    );
    this.name = WinThorLocalEndpointNotConfiguredError.name;
  }
}

export class WinThorLocalWindowNotFoundError extends Error {
  readonly code = 'WINTHOR_LOCAL_WINDOW_NOT_FOUND';

  constructor(
    readonly windowTitle: string,
    readonly timeoutMs?: number,
  ) {
    super(
      timeoutMs === undefined
        ? `WinThor window matching "${windowTitle}" is no longer available.`
        : `WinThor window matching "${windowTitle}" was not found within ${timeoutMs}ms.`,
    );
    this.name = WinThorLocalWindowNotFoundError.name;
  }
}

export class WinThorAuthenticationRequiredError extends Error {
  readonly code = 'WINTHOR_AUTHENTICATION_REQUIRED';

  constructor(readonly windowTitle: string) {
    super(
      `WinThor appears to require authentication before automation can continue (window: "${windowTitle}").`,
    );
    this.name = WinThorAuthenticationRequiredError.name;
  }
}

export class WinThorInvalidRoutineCodeError extends Error {
  readonly code = 'WINTHOR_ROUTINE_CODE_INVALID';

  constructor(readonly routineCode: number) {
    super(`Invalid WinThor routine code: ${routineCode}.`);
    this.name = WinThorInvalidRoutineCodeError.name;
  }
}

export class WinThorGoGlobalSessionStateError extends Error {
  readonly code = 'WINTHOR_GOGLOBAL_SESSION_STATE_INVALID';

  constructor(
    readonly operation: string,
    readonly expectedState: string,
  ) {
    super(
      `GO_GLOBAL session cannot ${operation}; expected state: ${expectedState}.`,
    );
    this.name = WinThorGoGlobalSessionStateError.name;
  }
}

export class WinThorGoGlobalEndpointNotConfiguredError extends Error {
  readonly code = 'WINTHOR_GOGLOBAL_ENDPOINT_NOT_CONFIGURED';

  constructor() {
    super(
      'GO_GLOBAL access profile must define endpoint with the App Controller Host Address.',
    );
    this.name = WinThorGoGlobalEndpointNotConfiguredError.name;
  }
}

export class WinThorGoGlobalClientNotFoundError extends Error {
  readonly code = 'WINTHOR_GOGLOBAL_CLIENT_NOT_FOUND';

  constructor(readonly timeoutMs: number) {
    super(
      `App Controller / GO-Global client window was not found within ${timeoutMs}ms.`,
    );
    this.name = WinThorGoGlobalClientNotFoundError.name;
  }
}

export class WinThorGoGlobalCredentialNotConfiguredError extends Error {
  readonly code = 'WINTHOR_GOGLOBAL_CREDENTIAL_NOT_CONFIGURED';

  constructor() {
    super(
      'GO_GLOBAL authentication requires username and secretReference. Use a Windows Credential Manager reference such as windows-credential:orquestra/winthor/producao.',
    );
    this.name = WinThorGoGlobalCredentialNotConfiguredError.name;
  }
}

export class WinThorGoGlobalAuthenticationRequiredError extends Error {
  readonly code = 'WINTHOR_GOGLOBAL_AUTHENTICATION_REQUIRED';

  constructor(readonly windowTitle: string) {
    super(
      `GO-Global still requires authentication before automation can continue (window: "${windowTitle}").`,
    );
    this.name = WinThorGoGlobalAuthenticationRequiredError.name;
  }
}
