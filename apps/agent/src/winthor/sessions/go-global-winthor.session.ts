import { setTimeout as sleep } from 'node:timers/promises';
import { URL } from 'node:url';

import type { WinThorConnectionProfile } from '@winaut/contracts';

import type { CredentialSecretResolver } from '../credentials/credential-secret-resolver.interface.js';
import { PowerShellWindowsCredentialSecretResolver } from '../credentials/powershell-windows-credential-secret.resolver.js';
import {
  GoGlobalDesktopState,
  type GoGlobalDesktopDriver,
} from '../windows/go-global-desktop-driver.interface.js';
import { PowerShellGoGlobalDesktopDriver } from '../windows/powershell-go-global-desktop.driver.js';
import {
  WinThorAuthenticationRequiredError,
  WinThorGoGlobalAuthenticationRequiredError,
  WinThorGoGlobalClientNotFoundError,
  WinThorGoGlobalCredentialNotConfiguredError,
  WinThorGoGlobalEndpointNotConfiguredError,
  WinThorGoGlobalSessionStateError,
  WinThorInvalidRoutineCodeError,
} from './winthor-session.errors.js';
import type { WinThorSession } from './winthor-session.interface.js';

const DEFAULT_APPLICATION_NAME = 'WinThor';
const DEFAULT_CONNECT_TIMEOUT_MS = 45_000;
const DEFAULT_APPLICATION_TIMEOUT_MS = 45_000;
const DEFAULT_POLL_INTERVAL_MS = 500;

function normalizeGoGlobalHostAddress(endpoint: string): string {
  const value = endpoint.trim();

  if (/^https?:\/\//i.test(value)) {
    try {
      return new URL(value).host;
    } catch {
      return value;
    }
  }

  return value.replace(/\/+$/, '');
}

interface GoGlobalWinThorSessionOptions {
  driver?: GoGlobalDesktopDriver;
  credentialResolver?: CredentialSecretResolver;
  connectTimeoutMs?: number;
  applicationTimeoutMs?: number;
  pollIntervalMs?: number;
}

export class GoGlobalWinThorSession implements WinThorSession {
  private readonly driver: GoGlobalDesktopDriver;
  private readonly credentialResolver: CredentialSecretResolver;
  private readonly connectTimeoutMs: number;
  private readonly applicationTimeoutMs: number;
  private readonly pollIntervalMs: number;

  private connected = false;
  private authenticated = false;
  private ownsClient = false;
  private ownedClientProcessId: number | null = null;
  private applicationAutoLaunchRequested = false;

  constructor(
    readonly profile: WinThorConnectionProfile | null,
    options: GoGlobalWinThorSessionOptions = {},
  ) {
    this.driver = options.driver ?? new PowerShellGoGlobalDesktopDriver();
    this.credentialResolver =
      options.credentialResolver ??
      new PowerShellWindowsCredentialSecretResolver();
    this.connectTimeoutMs =
      options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
    this.applicationTimeoutMs =
      options.applicationTimeoutMs ?? DEFAULT_APPLICATION_TIMEOUT_MS;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  }

  async connect(): Promise<void> {
    const host = normalizeGoGlobalHostAddress(this.profile?.endpoint ?? '');
    const applicationName =
      this.profile?.applicationName?.trim() || DEFAULT_APPLICATION_NAME;

    if (!host) {
      throw new WinThorGoGlobalEndpointNotConfiguredError();
    }

    let client = await this.driver.findClient();

    if (!client) {
      await this.driver.launchClient(host, applicationName);
      this.ownsClient = true;
      this.applicationAutoLaunchRequested = true;
      client = await this.waitForClient();
      this.ownedClientProcessId = client?.processId ?? null;
    }

    if (!client) {
      throw new WinThorGoGlobalClientNotFoundError(this.connectTimeoutMs);
    }

    if (this.applicationAutoLaunchRequested) {
      this.connected = true;
      return;
    }

    const state = await this.driver.inspectState();

    if (state.state === GoGlobalDesktopState.CLIENT_READY) {
      await this.driver.connectToHost(host);
      await this.waitForState(
        [
          GoGlobalDesktopState.LOGIN_REQUIRED,
          GoGlobalDesktopState.APPLICATION_CATALOG,
          GoGlobalDesktopState.WINTHOR_READY,
        ],
        this.connectTimeoutMs,
        'GO-Global connection',
      );
    }

    this.connected = true;
  }

  async ensureAuthenticated(): Promise<void> {
    this.assertConnected('ensureAuthenticated');

    if (this.applicationAutoLaunchRequested) {
      const reference = this.profile?.secretReference?.trim();

      if (!reference) {
        throw new WinThorGoGlobalCredentialNotConfiguredError();
      }

      const credential = await this.credentialResolver.resolve(reference);
      const username =
        this.profile?.username?.trim() || credential.username?.trim();

      if (!username) {
        throw new WinThorGoGlobalCredentialNotConfiguredError();
      }

      await this.driver.authenticate(username, credential.secret, true);

      throw new WinThorAuthenticationRequiredError(
        'WinThor internal login after GO-Global auto-launch',
      );
    }

    let state = await this.driver.inspectState();

    if (state.state === GoGlobalDesktopState.LOGIN_REQUIRED) {
      const reference = this.profile?.secretReference?.trim();

      if (!reference) {
        throw new WinThorGoGlobalCredentialNotConfiguredError();
      }

      const credential = await this.credentialResolver.resolve(reference);
      const username =
        this.profile?.username?.trim() || credential.username?.trim();

      if (!username) {
        throw new WinThorGoGlobalCredentialNotConfiguredError();
      }

      await this.driver.authenticate(username, credential.secret);
      state = await this.waitForState(
        [
          GoGlobalDesktopState.APPLICATION_CATALOG,
          GoGlobalDesktopState.WINTHOR_READY,
        ],
        this.connectTimeoutMs,
        'GO-Global authentication',
      );
    }

    if (
      state.state !== GoGlobalDesktopState.APPLICATION_CATALOG &&
      state.state !== GoGlobalDesktopState.WINTHOR_READY
    ) {
      throw new WinThorGoGlobalAuthenticationRequiredError(
        state.windowTitle ?? 'App Controller',
      );
    }

    this.authenticated = true;
  }

  async openRoutine(routineCode: number): Promise<void> {
    this.assertConnected('openRoutine');

    if (!this.authenticated) {
      throw new WinThorGoGlobalSessionStateError(
        'openRoutine',
        'authenticated',
      );
    }

    if (!Number.isInteger(routineCode) || routineCode <= 0) {
      throw new WinThorInvalidRoutineCodeError(routineCode);
    }

    if (this.applicationAutoLaunchRequested) {
      throw new WinThorAuthenticationRequiredError(
        'WinThor internal login after GO-Global auto-launch',
      );
    }

    let state = await this.driver.inspectState();

    if (state.state === GoGlobalDesktopState.APPLICATION_CATALOG) {
      await this.driver.launchApplication(
        this.profile?.applicationName?.trim() || DEFAULT_APPLICATION_NAME,
      );
      state = await this.waitForState(
        [GoGlobalDesktopState.WINTHOR_READY],
        this.applicationTimeoutMs,
        'WinThor remote application launch',
      );
    }

    if (state.state !== GoGlobalDesktopState.WINTHOR_READY) {
      throw new WinThorGoGlobalSessionStateError(
        'openRoutine',
        'WinThor ready',
      );
    }

    await this.driver.openRoutine(routineCode);
  }

  async disconnect(): Promise<void> {
    try {
      if (this.ownsClient) {
        await this.driver.closeSession(this.ownedClientProcessId);
      }
    } finally {
      this.connected = false;
      this.authenticated = false;
      this.ownsClient = false;
      this.ownedClientProcessId = null;
      this.applicationAutoLaunchRequested = false;
    }
  }

  private assertConnected(operation: string): void {
    if (!this.connected) {
      throw new WinThorGoGlobalSessionStateError(operation, 'connected');
    }
  }

  private async waitForClient() {
    const deadline = Date.now() + this.connectTimeoutMs;

    do {
      const client = await this.driver.findClient();

      if (client) {
        return client;
      }

      await sleep(this.pollIntervalMs);
    } while (Date.now() < deadline);

    return null;
  }

  private async waitForState(
    expectedStates: GoGlobalDesktopState[],
    timeoutMs: number,
    operation: string,
  ) {
    const inspectStateForPolling = async () => {
      try {
        return await this.driver.inspectState();
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes(
            'App Controller / GO-Global window was not found.',
          )
        ) {
          return null;
        }

        throw error;
      }
    };

    const deadline = Date.now() + timeoutMs;
    let current = await inspectStateForPolling();

    while (
      (current === null || !expectedStates.includes(current.state)) &&
      Date.now() < deadline
    ) {
      await sleep(this.pollIntervalMs);
      current = await inspectStateForPolling();
    }

    if (current === null || !expectedStates.includes(current.state)) {
      const lastObserved =
        current === null
          ? 'no App Controller / GO-Global window'
          : `${current.state}${
              current.windowTitle ? ` (window: "${current.windowTitle}")` : ''
            }`;

      throw new WinThorGoGlobalSessionStateError(
        operation,
        `${expectedStates.join(' or ')}; last observed: ${lastObserved}`,
      );
    }

    return current;
  }
}
