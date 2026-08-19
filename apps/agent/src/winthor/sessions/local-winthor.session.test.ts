import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  WinThorExecutionMode,
  type WinThorConnectionProfile,
} from '@winaut/contracts';

import type {
  LocalWinThorDesktopDriver,
  LocalWinThorWindow,
} from '../windows/local-winthor-desktop-driver.interface.js';
import { LocalWinThorSession } from './local-winthor.session.js';
import {
  WinThorAuthenticationRequiredError,
  WinThorInvalidRoutineCodeError,
  WinThorLocalEndpointNotConfiguredError,
  WinThorLocalSessionStateError,
} from './winthor-session.errors.js';

const profile: WinThorConnectionProfile = {
  id: 'profile-id',
  type: WinThorExecutionMode.LOCAL_WINDOWS,
  endpoint: 'C:\\WinThor\\WinThorStart.exe',
  applicationName: 'WinThor Produção',
  username: 'OPERADOR',
  secretReference: 'windows-credential:winthor-prod',
};

class FakeDesktopDriver implements LocalWinThorDesktopDriver {
  window: LocalWinThorWindow | null = null;
  readonly launched: string[] = [];
  readonly openedRoutines: Array<{
    processId: number;
    routineCode: number;
  }> = [];

  findWindow(_titleContains: string): Promise<LocalWinThorWindow | null> {
    return Promise.resolve(this.window);
  }

  launchEndpoint(endpoint: string): Promise<void> {
    this.launched.push(endpoint);
    this.window = {
      processId: 5070,
      processName: 'WinThorStart',
      title: 'WinThor Produção',
    };
    return Promise.resolve();
  }

  openRoutine(processId: number, routineCode: number): Promise<void> {
    this.openedRoutines.push({ processId, routineCode });
    return Promise.resolve();
  }
}

describe('LocalWinThorSession', () => {
  it('reuses an existing WinThor window and opens a routine without relaunching', async () => {
    const driver = new FakeDesktopDriver();
    driver.window = {
      processId: 1234,
      processName: 'WinThor',
      title: 'WinThor Produção',
    };

    const session = new LocalWinThorSession(profile, { driver });

    await session.connect();
    await session.ensureAuthenticated();
    await session.openRoutine(507);

    assert.deepEqual(driver.launched, []);
    assert.deepEqual(driver.openedRoutines, [
      { processId: 1234, routineCode: 507 },
    ]);
  });

  it('launches the configured endpoint when no WinThor window exists', async () => {
    const driver = new FakeDesktopDriver();
    const session = new LocalWinThorSession(profile, {
      driver,
      connectTimeoutMs: 50,
      pollIntervalMs: 1,
    });

    await session.connect();

    assert.deepEqual(driver.launched, [
      'C:\\WinThor\\WinThorStart.exe',
    ]);
  });

  it('fails safely when WinThor is closed and no endpoint is configured', async () => {
    const driver = new FakeDesktopDriver();
    const session = new LocalWinThorSession(
      {
        ...profile,
        endpoint: null,
      },
      { driver },
    );

    await assert.rejects(
      () => session.connect(),
      WinThorLocalEndpointNotConfiguredError,
    );
  });

  it('does not treat a login window as an authenticated session', async () => {
    const driver = new FakeDesktopDriver();
    driver.window = {
      processId: 1234,
      processName: 'WinThor',
      title: 'WinThor - Login',
    };

    const session = new LocalWinThorSession(profile, { driver });

    await session.connect();

    await assert.rejects(
      () => session.ensureAuthenticated(),
      WinThorAuthenticationRequiredError,
    );
  });

  it('requires a connected session and a positive integer routine code', async () => {
    const driver = new FakeDesktopDriver();
    const session = new LocalWinThorSession(profile, { driver });

    await assert.rejects(
      () => session.openRoutine(507),
      WinThorLocalSessionStateError,
    );

    driver.window = {
      processId: 1234,
      processName: 'WinThor',
      title: 'WinThor Produção',
    };

    await session.connect();

    await assert.rejects(
      () => session.openRoutine(0),
      WinThorInvalidRoutineCodeError,
    );
  });
});
