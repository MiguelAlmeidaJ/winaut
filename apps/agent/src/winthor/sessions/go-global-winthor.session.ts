import {
  WinThorExecutionMode,
  type WinThorConnectionProfile,
} from '@winaut/contracts';

import { WinThorSessionNotImplementedError } from './winthor-session.errors.js';
import type { WinThorSession } from './winthor-session.interface.js';

export class GoGlobalWinThorSession implements WinThorSession {
  constructor(readonly profile: WinThorConnectionProfile | null) {}

  connect(): Promise<void> {
    return this.notImplemented('connect');
  }

  ensureAuthenticated(): Promise<void> {
    return this.notImplemented('ensureAuthenticated');
  }

  openRoutine(_routineCode: number): Promise<void> {
    return this.notImplemented('openRoutine');
  }

  disconnect(): Promise<void> {
    return this.notImplemented('disconnect');
  }

  private notImplemented(operation: string): Promise<never> {
    return Promise.reject(
      new WinThorSessionNotImplementedError(
        WinThorExecutionMode.GO_GLOBAL,
        operation,
      ),
    );
  }
}
