import { setTimeout as sleep } from 'node:timers/promises';

import type { WinThorConnectionProfile } from '@winaut/contracts';

import type {
  LocalWinThorDesktopDriver,
  LocalWinThorWindow,
} from '../windows/local-winthor-desktop-driver.interface.js';
import { PowerShellLocalWinThorDesktopDriver } from '../windows/powershell-local-winthor-desktop.driver.js';
import {
  WinThorAuthenticationRequiredError,
  WinThorInvalidRoutineCodeError,
  WinThorLocalEndpointNotConfiguredError,
  WinThorLocalSessionStateError,
  WinThorLocalWindowNotFoundError,
} from './winthor-session.errors.js';
import type { WinThorSession } from './winthor-session.interface.js';

const DEFAULT_WINDOW_TITLE = 'WinThor';
const DEFAULT_CONNECT_TIMEOUT_MS = 30_000;
const DEFAULT_POLL_INTERVAL_MS = 250;

const AUTHENTICATION_TITLE_MARKERS = [
  'login',
  'autenticação',
  'autenticacao',
  'identificação',
  'identificacao',
];

interface LocalWinThorSessionOptions {
  driver?: LocalWinThorDesktopDriver;
  connectTimeoutMs?: number;
  pollIntervalMs?: number;
}

export class LocalWinThorSession implements WinThorSession {
  private readonly driver: LocalWinThorDesktopDriver;
  private readonly connectTimeoutMs: number;
  private readonly pollIntervalMs: number;
  private readonly windowTitle: string;

  private window: LocalWinThorWindow | null = null;

  constructor(
    readonly profile: WinThorConnectionProfile | null,
    options: LocalWinThorSessionOptions = {},
  ) {
    this.driver =
      options.driver ?? new PowerShellLocalWinThorDesktopDriver();
    this.connectTimeoutMs =
      options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
    this.pollIntervalMs =
      options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.windowTitle =
      profile?.applicationName?.trim() || DEFAULT_WINDOW_TITLE;
  }

  async connect(): Promise<void> {
    const existing = await this.driver.findWindow(this.windowTitle);

    if (existing) {
      this.window = existing;
      return;
    }

    const endpoint = this.profile?.endpoint?.trim();

    if (!endpoint) {
      throw new WinThorLocalEndpointNotConfiguredError(
        this.windowTitle,
      );
    }

    await this.driver.launchEndpoint(endpoint);
    this.window = await this.waitForWindow();
  }

  async ensureAuthenticated(): Promise<void> {
    const current = await this.refreshConnectedWindow(
      'checking authentication',
    );
    const normalizedTitle = current.title.toLocaleLowerCase('pt-BR');

    if (
      AUTHENTICATION_TITLE_MARKERS.some((marker) =>
        normalizedTitle.includes(marker),
      )
    ) {
      throw new WinThorAuthenticationRequiredError(current.title);
    }
  }

  async openRoutine(routineCode: number): Promise<void> {
    if (!Number.isInteger(routineCode) || routineCode <= 0) {
      throw new WinThorInvalidRoutineCodeError(routineCode);
    }

    const current = await this.refreshConnectedWindow(
      `opening routine ${routineCode}`,
    );

    await this.driver.openRoutine(
      current.processId,
      routineCode,
    );
  }

  disconnect(): Promise<void> {
    this.window = null;
    return Promise.resolve();
  }

  private async refreshConnectedWindow(
    operation: string,
  ): Promise<LocalWinThorWindow> {
    if (!this.window) {
      throw new WinThorLocalSessionStateError(operation);
    }

    const current = await this.driver.findWindow(this.windowTitle);

    if (!current) {
      this.window = null;
      throw new WinThorLocalWindowNotFoundError(
        this.windowTitle,
      );
    }

    this.window = current;
    return current;
  }

  private async waitForWindow(): Promise<LocalWinThorWindow> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < this.connectTimeoutMs) {
      const current = await this.driver.findWindow(this.windowTitle);

      if (current) {
        return current;
      }

      await sleep(this.pollIntervalMs);
    }

    throw new WinThorLocalWindowNotFoundError(
      this.windowTitle,
      this.connectTimeoutMs,
    );
  }
}
