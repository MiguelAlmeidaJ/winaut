import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  WinThorExecutionMode,
  type WinThorConnectionProfile,
} from '@winaut/contracts';

import {
  GoGlobalDesktopState,
  type GoGlobalClientWindow,
  type GoGlobalDesktopDriver,
  type GoGlobalDesktopInspection,
} from '../windows/go-global-desktop-driver.interface.js';
import { GoGlobalWinThorSession } from './go-global-winthor.session.js';

const profile: WinThorConnectionProfile = {
  id: 'profile-id',
  type: WinThorExecutionMode.GO_GLOBAL,
  endpoint: 'cliente.cloudtotvs.com.br',
  applicationName: 'WinThor',
  username: 'ORQUESTRA',
  secretReference: 'windows-credential:orquestra/winthor/producao',
};

class InspectFailureAfterLaunchDriver implements GoGlobalDesktopDriver {
  private client: GoGlobalClientWindow | null = null;
  private state: GoGlobalDesktopInspection = {
    state: GoGlobalDesktopState.CLIENT_READY,
    windowTitle: 'AppController',
  };
  private failNextInspect = false;
  readonly actions: string[] = [];

  constructor(private readonly failure: Error) {}

  findClient(): Promise<GoGlobalClientWindow | null> {
    return Promise.resolve(this.client);
  }

  launchClient(
    host?: string | null,
    applicationName?: string | null,
  ): Promise<void> {
    this.actions.push(
      `launchClient:${host ?? ''}:${applicationName ?? ''}`,
    );
    this.client = {
      processId: 101,
      processName: 'AppController',
      title: 'AppController',
    };
    this.state = {
      state: GoGlobalDesktopState.LOGIN_REQUIRED,
      windowTitle: 'TOTVS Cloud - Linha Winthor',
    };
    this.failNextInspect = true;
    return Promise.resolve();
  }

  connectToHost(host: string): Promise<void> {
    this.actions.push(`connect:${host}`);
    return Promise.resolve();
  }

  inspectState(): Promise<GoGlobalDesktopInspection> {
    if (this.failNextInspect) {
      this.failNextInspect = false;
      return Promise.reject(this.failure);
    }

    return Promise.resolve(this.state);
  }

  useExistingClient(): void {
    this.client = {
      processId: 202,
      processName: 'AppController',
      title: 'GO-Global',
    };
    this.failNextInspect = true;
  }

  authenticate(_username: string, _password: string): Promise<void> {
    return Promise.resolve();
  }

  launchApplication(_applicationName: string): Promise<void> {
    return Promise.resolve();
  }

  authenticateWinThor(
    _username: string,
    _password: string,
  ): Promise<void> {
    return Promise.resolve();
  }

  openRoutine(_routineCode: number): Promise<void> {
    return Promise.resolve();
  }

  closeSession(): Promise<void> {
    return Promise.resolve();
  }
}

describe('GoGlobalWinThorSession transient state polling', () => {
  it('does not require UI inspection after an owned auto-launch', async () => {
    const driver = new InspectFailureAfterLaunchDriver(
      new Error(
        'App Controller operation "inspectState" failed: App Controller / GO-Global window was not found.',
      ),
    );
    const session = new GoGlobalWinThorSession(profile, {
      driver,
      connectTimeoutMs: 50,
      pollIntervalMs: 1,
    });

    await session.connect();

    assert.deepEqual(driver.actions, [
      'launchClient:cliente.cloudtotvs.com.br:WinThor',
    ]);
  });

  it('does not hide non-transient desktop inspection failures for existing sessions', async () => {
    const driver = new InspectFailureAfterLaunchDriver(
      new Error('UI Automation inspection failed.'),
    );
    driver.useExistingClient();

    const session = new GoGlobalWinThorSession(profile, {
      driver,
      connectTimeoutMs: 50,
      pollIntervalMs: 1,
    });

    await assert.rejects(
      () => session.connect(),
      /UI Automation inspection failed/,
    );
  });
});
