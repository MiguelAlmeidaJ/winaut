export const GoGlobalDesktopState = {
  CLIENT_READY: 'CLIENT_READY',
  LOGIN_REQUIRED: 'LOGIN_REQUIRED',
  APPLICATION_CATALOG: 'APPLICATION_CATALOG',
  WINTHOR_READY: 'WINTHOR_READY',
} as const;

export type GoGlobalDesktopState =
  (typeof GoGlobalDesktopState)[keyof typeof GoGlobalDesktopState];

export interface GoGlobalClientWindow {
  processId: number;
  processName: string;
  title: string;
}

export interface GoGlobalDesktopInspection {
  state: GoGlobalDesktopState;
  windowTitle: string | null;
}

export interface GoGlobalDesktopDriver {
  findClient(): Promise<GoGlobalClientWindow | null>;
  launchClient(
    host?: string | null,
    applicationName?: string | null,
  ): Promise<void>;
  connectToHost(host: string): Promise<void>;
  inspectState(): Promise<GoGlobalDesktopInspection>;
  authenticate(
    username: string,
    password: string,
    allowOpaqueFallback?: boolean,
  ): Promise<void>;
  launchApplication(applicationName: string): Promise<void>;
  openRoutine(routineCode: number): Promise<void>;
  closeSession(processId?: number | null): Promise<void>;
}
