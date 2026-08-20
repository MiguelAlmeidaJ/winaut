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
  WinThorAuthenticationRequiredError,
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
  readonly inspections: GoGlobalDesktopInspection[] = [];
  private autoLaunchRequested = false;

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
    this.autoLaunchRequested = Boolean(host && applicationName);
    this.client = {
      processId: 101,
      processName: 'AppController',
      title: 'AppController',
    };
    if (host) {
      this.state = {
        state: GoGlobalDesktopState.LOGIN_REQUIRED,
        windowTitle: 'TOTVS Cloud - Linha Winthor',
      };
      this.inspections.push(
        {
          state: GoGlobalDesktopState.APPLICATION_CATALOG,
          windowTitle: 'AppController starting',
        },
        this.state,
      );
    }
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
    return Promise.resolve(this.inspections.shift() ?? this.state);
  }

  authenticate(username: string, password: string): Promise<void> {
    this.actions.push(`authenticate:${username}:${password}`);

    if (this.autoLaunchRequested) {
      this.state = {
        state: GoGlobalDesktopState.LOGIN_REQUIRED,
        windowTitle:
          'TOTVS Cloud - Linha WinThor - Test Company - Production',
      };
      this.inspections.push(
        {
          state: GoGlobalDesktopState.APPLICATION_CATALOG,
          windowTitle: 'Please wait...',
        },
        {
          state: GoGlobalDesktopState.WINTHOR_READY,
          windowTitle: 'TOTVS Cloud - Linha WinThor - starting',
        },
        this.state,
      );
    } else {
      this.state = {
        state: GoGlobalDesktopState.APPLICATION_CATALOG,
        windowTitle: 'GO-Global',
      };
    }

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
    await assert.rejects(
      () => session.ensureAuthenticated(),
      WinThorAuthenticationRequiredError,
    );
    await session.disconnect();

    assert.deepEqual(credentialResolver.references, [
      'windows-credential:orquestra/winthor/producao',
    ]);
    assert.deepEqual(driver.actions, [
      'launchClient:cliente.cloudtotvs.com.br:WinThor',
      'authenticate:ORQUESTRA:segredo',
      'closeSession',
    ]);
  });

  it('normalizes URL-style Host Address before connecting App Controller', async () => {
    const cases = [
      ['https://cliente.cloudtotvs.com.br/', 'cliente.cloudtotvs.com.br'],
      ['http://cliente.cloudtotvs.com.br/', 'cliente.cloudtotvs.com.br'],
      ['cliente.cloudtotvs.com.br', 'cliente.cloudtotvs.com.br'],
      ['cliente.cloudtotvs.com.br:491', 'cliente.cloudtotvs.com.br:491'],
    ] as const;

    for (const [endpoint, expectedHost] of cases) {
      const driver = new FakeGoGlobalDriver();
      const session = new GoGlobalWinThorSession(
        { ...profile, endpoint },
        {
          driver,
          credentialResolver: new FakeCredentialResolver(),
          connectTimeoutMs: 50,
          pollIntervalMs: 1,
        },
      );

      await session.connect();

      assert.deepEqual(driver.actions, [
        `launchClient:${expectedHost}:WinThor`,
      ]);
    }
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
