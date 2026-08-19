import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  WinThorExecutionMode,
  type WinThorConnectionProfile,
} from '@winaut/contracts';

import type {
  CredentialSecretResolver,
  ResolvedCredentialSecret,
} from '../credentials/credential-secret-resolver.interface.js';
import {
  GoGlobalDesktopState,
  type GoGlobalClientWindow,
  type GoGlobalDesktopDriver,
  type GoGlobalDesktopInspection,
} from '../windows/go-global-desktop-driver.interface.js';
import {
  WinThorGoGlobalCredentialNotConfiguredError,
  WinThorGoGlobalEndpointNotConfiguredError,
  WinThorGoGlobalSessionStateError,
  WinThorInvalidRoutineCodeError,
} from './winthor-session.errors.js';
import { GoGlobalWinThorSession } from './go-global-winthor.session.js';

const profile: WinThorConnectionProfile = {
  id: 'profile-id',
  type: WinThorExecutionMode.GO_GLOBAL,
  endpoint: 'cliente.cloudtotvs.com.br',
  applicationName: 'WinThor',
  username: 'ORQUESTRA',
  secretReference: 'windows-credential:orquestra/winthor/producao',
};

class FakeCredentialResolver implements CredentialSecretResolver {
  readonly references: string[] = [];

  constructor(
    private readonly credential: ResolvedCredentialSecret = {
      username: null,
      secret: 'segredo',
    },
  ) {}

  resolve(reference: string): Promise<ResolvedCredentialSecret> {
    this.references.push(reference);
    return Promise.resolve(this.credential);
  }
}

class FakeGoGlobalDriver implements GoGlobalDesktopDriver {
  client: GoGlobalClientWindow | null = null;
  state: GoGlobalDesktopInspection = {
    state: GoGlobalDesktopState.CLIENT_READY,
    windowTitle: 'AppController',
  };
  readonly actions: string[] = [];

  findClient(): Promise<GoGlobalClientWindow | null> {
    return Promise.resolve(this.client);
  }

  launchClient(): Promise<void> {
    this.actions.push('launchClient');
    this.client = {
      processId: 101,
      processName: 'AppController',
      title: 'AppController',
    };
    return Promise.resolve();
  }

  connectToHost(host: string): Promise<void> {
    this.actions.push(`connect:${host}`);
    this.state = {
      state: GoGlobalDesktopState.LOGIN_REQUIRED,
      windowTitle: 'GO-Global Logon',
    };
    return Promise.resolve();
  }

  inspectState(): Promise<GoGlobalDesktopInspection> {
    return Promise.resolve(this.state);
  }

  authenticate(username: string, password: string): Promise<void> {
    this.actions.push(`authenticate:${username}:${password}`);
    this.state = {
      state: GoGlobalDesktopState.APPLICATION_CATALOG,
      windowTitle: 'GO-Global',
    };
    return Promise.resolve();
  }

  launchApplication(applicationName: string): Promise<void> {
    this.actions.push(`launchApplication:${applicationName}`);
    this.state = {
      state: GoGlobalDesktopState.WINTHOR_READY,
      windowTitle: 'WinThor',
    };
    return Promise.resolve();
  }

  openRoutine(routineCode: number): Promise<void> {
    this.actions.push(`openRoutine:${routineCode}`);
    return Promise.resolve();
  }

  closeSession(): Promise<void> {
    this.actions.push('closeSession');
    return Promise.resolve();
  }
}

describe('GoGlobalWinThorSession', () => {
  it('owns the complete App Controller lifecycle when it launches the client', async () => {
    const driver = new FakeGoGlobalDriver();
    const credentialResolver = new FakeCredentialResolver();
    const session = new GoGlobalWinThorSession(profile, {
      driver,
      credentialResolver,
      connectTimeoutMs: 50,
      applicationTimeoutMs: 50,
      pollIntervalMs: 1,
    });

    await session.connect();
    await session.ensureAuthenticated();
    await session.openRoutine(101);
    await session.disconnect();

    assert.deepEqual(credentialResolver.references, [
      'windows-credential:orquestra/winthor/producao',
    ]);
    assert.deepEqual(driver.actions, [
      'launchClient',
      'connect:cliente.cloudtotvs.com.br',
      'authenticate:ORQUESTRA:segredo',
      'launchApplication:WinThor',
      'openRoutine:101',
      'closeSession',
    ]);
  });

  it('reuses an authenticated existing session without closing it', async () => {
    const driver = new FakeGoGlobalDriver();
    driver.client = {
      processId: 202,
      processName: 'AppController',
      title: 'GO-Global',
    };
    driver.state = {
      state: GoGlobalDesktopState.APPLICATION_CATALOG,
      windowTitle: 'GO-Global',
    };

    const session = new GoGlobalWinThorSession(profile, {
      driver,
      credentialResolver: new FakeCredentialResolver(),
      pollIntervalMs: 1,
    });

    await session.connect();
    await session.ensureAuthenticated();
    await session.openRoutine(101);
    await session.disconnect();

    assert.deepEqual(driver.actions, [
      'launchApplication:WinThor',
      'openRoutine:101',
    ]);
  });

  it('requires Host Address before starting App Controller', async () => {
    const session = new GoGlobalWinThorSession(
      { ...profile, endpoint: null },
      {
        driver: new FakeGoGlobalDriver(),
        credentialResolver: new FakeCredentialResolver(),
      },
    );

    await assert.rejects(
      () => session.connect(),
      WinThorGoGlobalEndpointNotConfiguredError,
    );
  });

  it('fails safely when login is required without a secret reference', async () => {
    const driver = new FakeGoGlobalDriver();
    const session = new GoGlobalWinThorSession(
      { ...profile, secretReference: null },
      {
        driver,
        credentialResolver: new FakeCredentialResolver(),
        connectTimeoutMs: 50,
        pollIntervalMs: 1,
      },
    );

    await session.connect();

    await assert.rejects(
      () => session.ensureAuthenticated(),
      WinThorGoGlobalCredentialNotConfiguredError,
    );
  });

  it('requires authentication and a valid routine code before opening WinThor routines', async () => {
    const driver = new FakeGoGlobalDriver();
    driver.client = {
      processId: 303,
      processName: 'AppController',
      title: 'GO-Global',
    };
    driver.state = {
      state: GoGlobalDesktopState.APPLICATION_CATALOG,
      windowTitle: 'GO-Global',
    };

    const session = new GoGlobalWinThorSession(profile, {
      driver,
      credentialResolver: new FakeCredentialResolver(),
      pollIntervalMs: 1,
    });

    await session.connect();

    await assert.rejects(
      () => session.openRoutine(101),
      WinThorGoGlobalSessionStateError,
    );

    await session.ensureAuthenticated();

    await assert.rejects(
      () => session.openRoutine(0),
      WinThorInvalidRoutineCodeError,
    );
  });
});
