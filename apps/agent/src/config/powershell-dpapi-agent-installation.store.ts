import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type {
  AgentInstallation,
  AgentInstallationStore,
} from './agent-installation-store.interface.js';

interface StoredAgentInstallation {
  apiUrl: string;
  protectedToken: string;
}

export class AgentInstallationPlatformError extends Error {
  readonly code = 'AGENT_INSTALLATION_PLATFORM_UNSUPPORTED';

  constructor(readonly platform: NodeJS.Platform) {
    super(
      `Secure Agent installation storage is only available on Windows (current platform: ${platform}).`,
    );
    this.name = AgentInstallationPlatformError.name;
  }
}

export class PowerShellDpapiAgentInstallationStore
  implements AgentInstallationStore
{
  private readonly filePath: string;

  constructor(filePath = defaultInstallationPath()) {
    this.filePath = filePath;
  }

  async load(): Promise<AgentInstallation | null> {
    if (process.platform !== 'win32') {
      return null;
    }

    let raw: string;

    try {
      raw = await readFile(this.filePath, 'utf8');
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return null;
      }

      throw error;
    }

    const stored = JSON.parse(raw) as StoredAgentInstallation;

    if (!stored.apiUrl || !stored.protectedToken) {
      throw new Error(
        `Invalid Orquestra Agent installation file: ${this.filePath}`,
      );
    }

    return {
      apiUrl: stored.apiUrl,
      token: await unprotectToken(stored.protectedToken),
    };
  }

  async save(installation: AgentInstallation): Promise<void> {
    if (process.platform !== 'win32') {
      throw new AgentInstallationPlatformError(process.platform);
    }

    const apiUrl = installation.apiUrl.trim().replace(/\/+$/, '');

    if (!apiUrl || !installation.token) {
      throw new Error('Agent installation requires API URL and token.');
    }

    const stored: StoredAgentInstallation = {
      apiUrl,
      protectedToken: await protectToken(installation.token),
    };

    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(
      this.filePath,
      `${JSON.stringify(stored, null, 2)}\n`,
      {
        encoding: 'utf8',
        mode: 0o600,
      },
    );
  }
}

function defaultInstallationPath(): string {
  const base =
    process.env.LOCALAPPDATA?.trim() ||
    process.env.APPDATA?.trim() ||
    process.cwd();

  return join(base, 'Orquestra', 'Agent', 'installation.json');
}

function protectToken(token: string): Promise<string> {
  const script = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$inputBytes = [Console]::OpenStandardInput()
$reader = New-Object System.IO.StreamReader($inputBytes, [System.Text.Encoding]::UTF8)
$token = $reader.ReadToEnd()
$bytes = [System.Text.Encoding]::UTF8.GetBytes($token)
$protected = [System.Security.Cryptography.ProtectedData]::Protect(
  $bytes,
  $null,
  [System.Security.Cryptography.DataProtectionScope]::CurrentUser
)
[Convert]::ToBase64String($protected)
`;

  return runPowerShell(script, token);
}

function unprotectToken(protectedToken: string): Promise<string> {
  const script = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$inputBytes = [Console]::OpenStandardInput()
$reader = New-Object System.IO.StreamReader($inputBytes, [System.Text.Encoding]::UTF8)
$value = $reader.ReadToEnd().Trim()
$protected = [Convert]::FromBase64String($value)
$bytes = [System.Security.Cryptography.ProtectedData]::Unprotect(
  $protected,
  $null,
  [System.Security.Cryptography.DataProtectionScope]::CurrentUser
)
[System.Text.Encoding]::UTF8.GetString($bytes)
`;

  return runPowerShell(script, protectedToken);
}

function runPowerShell(script: string, stdin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell.exe',
      [
        '-NoLogo',
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        script,
      ],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
      },
    );

    let stdout = '';
    let stderr = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `Windows DPAPI operation failed with exit code ${code}: ${stderr.trim() || 'unknown error'}`,
          ),
        );
        return;
      }

      resolve(stdout.trim());
    });

    child.stdin.end(stdin, 'utf8');
  });
}
