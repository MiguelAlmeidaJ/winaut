import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import type {
  LocalWinThorDesktopDriver,
  LocalWinThorWindow,
} from './local-winthor-desktop-driver.interface.js';

const execFileAsync = promisify(execFile);

interface PowerShellDriverOptions {
  executable?: string;
  timeoutMs?: number;
}

export class PowerShellLocalWinThorDesktopDriver
  implements LocalWinThorDesktopDriver
{
  private readonly executable: string;
  private readonly timeoutMs: number;

  constructor(options: PowerShellDriverOptions = {}) {
    this.executable = options.executable ?? 'powershell.exe';
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  async findWindow(
    titleContains: string,
  ): Promise<LocalWinThorWindow | null> {
    this.assertWindows();

    const output = await this.run(
      [
        "$needle = $env:ORQUESTRA_WINTHOR_WINDOW_TITLE",
        '$process = Get-Process -ErrorAction SilentlyContinue | Where-Object {',
        '  $_.MainWindowHandle -ne 0 -and',
        '  $_.MainWindowTitle.IndexOf($needle, [System.StringComparison]::OrdinalIgnoreCase) -ge 0',
        '} | Select-Object -First 1',
        'if ($null -eq $process) {',
        "  Write-Output 'null'",
        '  exit 0',
        '}',
        '[PSCustomObject]@{',
        '  processId = $process.Id',
        '  processName = $process.ProcessName',
        '  title = $process.MainWindowTitle',
        '} | ConvertTo-Json -Compress',
      ].join('\n'),
      {
        ORQUESTRA_WINTHOR_WINDOW_TITLE: titleContains,
      },
    );

    if (!output || output === 'null') {
      return null;
    }

    const parsed = JSON.parse(output) as Partial<LocalWinThorWindow>;

    if (
      typeof parsed.processId !== 'number' ||
      typeof parsed.processName !== 'string' ||
      typeof parsed.title !== 'string'
    ) {
      throw new Error(
        'PowerShell returned an invalid WinThor window descriptor.',
      );
    }

    return {
      processId: parsed.processId,
      processName: parsed.processName,
      title: parsed.title,
    };
  }

  async launchEndpoint(endpoint: string): Promise<void> {
    this.assertWindows();

    await this.run(
      [
        '$endpoint = $env:ORQUESTRA_WINTHOR_ENDPOINT',
        "if ($endpoint -match '^https?://') {",
        '  Start-Process -FilePath $endpoint | Out-Null',
        '  exit 0',
        '}',
        'if (-not (Test-Path -LiteralPath $endpoint -PathType Leaf)) {',
        "  throw \"WinThor endpoint was not found: $endpoint\"",
        '}',
        'Start-Process -FilePath $endpoint | Out-Null',
      ].join('\n'),
      {
        ORQUESTRA_WINTHOR_ENDPOINT: endpoint,
      },
    );
  }

  async openRoutine(
    processId: number,
    routineCode: number,
  ): Promise<void> {
    this.assertWindows();

    await this.run(
      [
        '$processId = [int]$env:ORQUESTRA_WINTHOR_PROCESS_ID',
        '$routineCode = $env:ORQUESTRA_WINTHOR_ROUTINE_CODE',
        '$shell = New-Object -ComObject WScript.Shell',
        'if (-not $shell.AppActivate($processId)) {',
        "  throw \"Could not activate WinThor process $processId.\"",
        '}',
        'Start-Sleep -Milliseconds 200',
        '$shell.SendKeys($routineCode)',
        'Start-Sleep -Milliseconds 100',
        "$shell.SendKeys('{ENTER}')",
      ].join('\n'),
      {
        ORQUESTRA_WINTHOR_PROCESS_ID: String(processId),
        ORQUESTRA_WINTHOR_ROUTINE_CODE: String(routineCode),
      },
    );
  }

  private async run(
    script: string,
    variables: Record<string, string>,
  ): Promise<string> {
    const { stdout } = await execFileAsync(
      this.executable,
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
        encoding: 'utf8',
        timeout: this.timeoutMs,
        windowsHide: true,
        env: {
          ...process.env,
          ...variables,
        },
      },
    );

    return stdout.trim();
  }

  private assertWindows(): void {
    if (process.platform !== 'win32') {
      throw new Error(
        'LOCAL_WINDOWS WinThor automation can only run on Windows.',
      );
    }
  }
}
