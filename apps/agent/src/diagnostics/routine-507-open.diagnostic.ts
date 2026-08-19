import 'dotenv/config';

import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { promisify } from 'node:util';

import { WinThorExecutionMode } from '@winaut/contracts';

import { AgentApiClient } from '../communication/agent-api-client.js';
import { loadAgentEnvironment } from '../config/agent-env.js';
import { LocalWinThorSession } from '../winthor/sessions/local-winthor.session.js';

const execFileAsync = promisify(execFile);

interface UiControlSnapshot {
  name: string;
  automationId: string;
  controlType: string;
  className: string;
  enabled: boolean;
  offscreen: boolean;
}

interface UiWindowSnapshot {
  processId: number;
  processName: string;
  title: string;
  candidate: boolean;
  controls: UiControlSnapshot[];
}

function positiveIntegerEnvironment(
  name: string,
  defaultValue: number,
): number {
  const raw = process.env[name]?.trim();

  if (!raw) {
    return defaultValue;
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `Environment variable "${name}" must be a positive integer.`,
    );
  }

  return parsed;
}

async function captureUiSnapshot(): Promise<UiWindowSnapshot[]> {
  if (process.platform !== 'win32') {
    throw new Error(
      'Routine 507 UI diagnostic can only run on Windows.',
    );
  }

  const script = [
    'Add-Type -AssemblyName UIAutomationClient',
    'Add-Type -AssemblyName UIAutomationTypes',
    '$root = [System.Windows.Automation.AutomationElement]::RootElement',
    '$windows = $root.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition)',
    '$result = @()',
    'foreach ($window in $windows) {',
    '  $title = $window.Current.Name',
    '  if ([string]::IsNullOrWhiteSpace($title)) { continue }',
    '  $processId = $window.Current.ProcessId',
    '  $processName = ""',
    '  try { $processName = (Get-Process -Id $processId -ErrorAction Stop).ProcessName } catch {}',
    '  $candidate = $title -match "(?i)(^|[^0-9])507([^0-9]|$)|Atualiza.*Eventual|WinThor"',
    '  $controls = @()',
    '  if ($candidate) {',
    '    $descendants = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants, [System.Windows.Automation.Condition]::TrueCondition)',
    '    $limit = [Math]::Min($descendants.Count, 500)',
    '    for ($index = 0; $index -lt $limit; $index++) {',
    '      $control = $descendants.Item($index)',
    '      $controls += [PSCustomObject]@{',
    '        name = $control.Current.Name',
    '        automationId = $control.Current.AutomationId',
    '        controlType = $control.Current.ControlType.ProgrammaticName',
    '        className = $control.Current.ClassName',
    '        enabled = $control.Current.IsEnabled',
    '        offscreen = $control.Current.IsOffscreen',
    '      }',
    '    }',
    '  }',
    '  $result += [PSCustomObject]@{',
    '    processId = $processId',
    '    processName = $processName',
    '    title = $title',
    '    candidate = $candidate',
    '    controls = $controls',
    '  }',
    '}',
    'ConvertTo-Json -InputObject @($result) -Depth 6 -Compress',
  ].join('\n');

  const { stdout } = await execFileAsync(
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
      encoding: 'utf8',
      timeout: 30_000,
      windowsHide: true,
      maxBuffer: 5 * 1024 * 1024,
    },
  );

  const text = stdout.trim();

  if (!text) {
    return [];
  }

  const parsed = JSON.parse(text) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error(
      'PowerShell UI Automation diagnostic returned an invalid payload.',
    );
  }

  return parsed as UiWindowSnapshot[];
}

async function main(): Promise<void> {
  const environment = loadAgentEnvironment();
  const apiClient = new AgentApiClient({
    apiUrl: environment.apiUrl,
    token: environment.token,
    requestTimeoutMs: environment.requestTimeoutMs,
  });

  console.log('[Diagnostic 507] Loading agent configuration...');

  const config = await apiClient.getConfig();

  if (
    config.winthorInstance.executionMode !==
    WinThorExecutionMode.LOCAL_WINDOWS
  ) {
    throw new Error(
      `Diagnostic 507 requires LOCAL_WINDOWS, but this agent is configured for ${config.winthorInstance.executionMode}.`,
    );
  }

  const session = new LocalWinThorSession(config.accessProfile);
  let connected = false;

  try {
    console.log('[Diagnostic 507] Connecting to WinThor...');
    await session.connect();
    connected = true;

    console.log('[Diagnostic 507] Checking authentication state...');
    await session.ensureAuthenticated();

    console.log(
      '[Diagnostic 507] Opening routine 507. No recalculation will be executed.',
    );
    await session.openRoutine(507);

    const waitMs = positiveIntegerEnvironment(
      'WINAUT_ROUTINE_507_DIAGNOSTIC_WAIT_MS',
      2_000,
    );

    console.log(
      `[Diagnostic 507] Waiting ${waitMs}ms for the routine UI...`,
    );
    await sleep(waitMs);

    console.log('[Diagnostic 507] Capturing Windows UI Automation tree...');
    const windows = await captureUiSnapshot();
    const candidates = windows.filter((window) => window.candidate);

    const outputPath = resolve(
      process.env.WINAUT_ROUTINE_507_DIAGNOSTIC_OUTPUT?.trim() ||
        'routine-507-ui-snapshot.json',
    );

    await writeFile(
      outputPath,
      `${JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          winthorInstance: {
            id: config.winthorInstance.id,
            name: config.winthorInstance.name,
            executionMode: config.winthorInstance.executionMode,
          },
          expectedWindowTitle:
            config.accessProfile?.applicationName?.trim() || 'WinThor',
          candidateCount: candidates.length,
          windows,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    console.log(
      `[Diagnostic 507] Snapshot saved to ${outputPath}`,
    );
    console.log(
      `[Diagnostic 507] Candidate windows: ${candidates.length}; total visible windows: ${windows.length}.`,
    );

    if (candidates.length === 0) {
      console.warn(
        '[Diagnostic 507] No 507/WinThor candidate was detected. The snapshot still contains the visible top-level window titles for diagnosis.',
      );
    }
  } finally {
    if (connected) {
      await session.disconnect();
    }
  }
}

void main().catch((error: unknown) => {
  console.error(
    '[Diagnostic 507] Failed:',
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
