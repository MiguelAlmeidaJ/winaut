import { mkdir, open, readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export class AgentAlreadyRunningError extends Error {
  readonly code = 'AGENT_ALREADY_RUNNING';

  constructor(readonly pid: number | null) {
    super(
      pid === null
        ? 'Another Orquestra Agent instance appears to be running.'
        : `Another Orquestra Agent instance is already running (PID ${pid}).`,
    );
    this.name = AgentAlreadyRunningError.name;
  }
}

export interface AgentSingleInstanceLockOptions {
  filePath?: string;
  isProcessRunning?: (pid: number) => boolean;
}

export async function acquireAgentSingleInstanceLock(
  options: AgentSingleInstanceLockOptions = {},
): Promise<() => Promise<void>> {
  const filePath = options.filePath ?? defaultLockPath();
  const isProcessRunning = options.isProcessRunning ?? processExists;

  await mkdir(dirname(filePath), { recursive: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(filePath, 'wx', 0o600);
      await handle.writeFile(`${process.pid}\n`, 'utf8');
      await handle.close();

      let released = false;
      return async () => {
        if (released) {
          return;
        }

        released = true;
        await rm(filePath, { force: true });
      };
    } catch (error) {
      if (!isAlreadyExists(error)) {
        throw error;
      }

      const existingPid = await readPid(filePath);
      if (existingPid !== null && isProcessRunning(existingPid)) {
        throw new AgentAlreadyRunningError(existingPid);
      }

      if (attempt === 1) {
        throw new AgentAlreadyRunningError(existingPid);
      }

      await rm(filePath, { force: true });
    }
  }

  throw new AgentAlreadyRunningError(null);
}

function defaultLockPath(): string {
  const base =
    process.env.LOCALAPPDATA?.trim() ||
    process.env.APPDATA?.trim() ||
    process.cwd();

  return join(base, 'Orquestra', 'Agent', 'agent.lock');
}

async function readPid(filePath: string): Promise<number | null> {
  try {
    const value = Number((await readFile(filePath, 'utf8')).trim());
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !(
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ESRCH'
    );
  }
}

function isAlreadyExists(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'EEXIST'
  );
}
