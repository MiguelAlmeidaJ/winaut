import { WinThorExecutionMode, type AgentConfig } from '@winaut/contracts';

import { GoGlobalWinThorSession } from './go-global-winthor.session.js';
import { LocalWinThorSession } from './local-winthor.session.js';
import { UnsupportedWinThorExecutionModeError } from './winthor-session.errors.js';
import type { WinThorSession } from './winthor-session.interface.js';

interface SessionFactoryLogger {
  info(message: string): void;
}

export class WinThorSessionFactory {
  constructor(private readonly logger: SessionFactoryLogger = console) {}

  create(config: AgentConfig): WinThorSession {
    const mode = config.winthorInstance.executionMode;
    this.logger.info(`WinThor session mode selected: ${mode}`);

    switch (mode) {
      case WinThorExecutionMode.LOCAL_WINDOWS:
        return new LocalWinThorSession(config.accessProfile);
      case WinThorExecutionMode.GO_GLOBAL:
        return new GoGlobalWinThorSession(config.accessProfile);
      case WinThorExecutionMode.RDP:
      case WinThorExecutionMode.CITRIX:
      case WinThorExecutionMode.API:
      default:
        throw new UnsupportedWinThorExecutionModeError(mode);
    }
  }
}
