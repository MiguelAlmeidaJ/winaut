import { spawn } from 'node:child_process';

import {
  GoGlobalDesktopState,
  type GoGlobalClientWindow,
  type GoGlobalDesktopDriver,
  type GoGlobalDesktopInspection,
} from './go-global-desktop-driver.interface.js';

interface PowerShellResult {
  [key: string]: unknown;
}

interface PowerShellGoGlobalDesktopDriverOptions {
  executablePath?: string | null;
  commandTimeoutMs?: number;
}

const DEFAULT_COMMAND_TIMEOUT_MS = 30_000;

export class PowerShellGoGlobalDesktopDriver
  implements GoGlobalDesktopDriver
{
  private readonly executablePath: string | null;
  private readonly commandTimeoutMs: number;

  constructor(options: PowerShellGoGlobalDesktopDriverOptions = {}) {
    this.executablePath =
      options.executablePath?.trim() ||
      process.env.WINAUT_GOGLOBAL_APP_CONTROLLER_PATH?.trim() ||
      null;
    this.commandTimeoutMs =
      options.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS;
  }

  async findClient(): Promise<GoGlobalClientWindow | null> {
    const result = await this.run('findClient');

    if (result.found !== true) {
      return null;
    }

    return {
      processId: Number(result.processId),
      processName: String(result.processName ?? ''),
      title: String(result.title ?? ''),
    };
  }

  async launchClient(
    host?: string | null,
    applicationName?: string | null,
  ): Promise<void> {
    await this.run('launchClient', {
      executablePath: this.executablePath,
      host: host?.trim() || null,
      applicationName: applicationName?.trim() || null,
    });
  }

  async connectToHost(host: string): Promise<void> {
    await this.run('connectToHost', { host });
  }

  async inspectState(): Promise<GoGlobalDesktopInspection> {
    const result = await this.run('inspectState');
    const state = result.state;

    if (
      state !== GoGlobalDesktopState.CLIENT_READY &&
      state !== GoGlobalDesktopState.LOGIN_REQUIRED &&
      state !== GoGlobalDesktopState.APPLICATION_CATALOG &&
      state !== GoGlobalDesktopState.WINTHOR_READY
    ) {
      throw new Error(
        `App Controller returned an unknown desktop state: ${String(state)}.`,
      );
    }

    return {
      state,
      windowTitle:
        typeof result.windowTitle === 'string' ? result.windowTitle : null,
    };
  }

  async authenticate(username: string, password: string): Promise<void> {
    await this.run('authenticate', { username, password });
  }

  async launchApplication(applicationName: string): Promise<void> {
    await this.run('launchApplication', { applicationName });
  }

  async openRoutine(routineCode: number): Promise<void> {
    await this.run('openRoutine', { routineCode });
  }

  async closeSession(): Promise<void> {
    await this.run('closeSession');
  }

  private run(
    operation: string,
    payload: Record<string, unknown> = {},
  ): Promise<PowerShellResult> {
    if (process.platform !== 'win32') {
      return Promise.reject(
        new Error(
          `GO_GLOBAL desktop automation requires Windows (current platform: ${process.platform}).`,
        ),
      );
    }

    const script = this.buildScript(operation);

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
          windowsHide: true,
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      );

      let stdout = '';
      let stderr = '';
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        child.kill();
        reject(
          new Error(
            `App Controller operation "${operation}" timed out after ${this.commandTimeoutMs}ms.`,
          ),
        );
      }, this.commandTimeoutMs);

      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk: string) => {
        stderr += chunk;
      });
      child.once('error', (error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        reject(error);
      });
      child.once('close', (code) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);

        if (code !== 0) {
          reject(
            new Error(
              `App Controller operation "${operation}" failed: ${stderr.trim() || `PowerShell exited with code ${code}.`}`,
            ),
          );
          return;
        }

        const text = stdout.trim();

        if (!text) {
          resolve({});
          return;
        }

        try {
          resolve(JSON.parse(text) as PowerShellResult);
        } catch {
          reject(
            new Error(
              `App Controller operation "${operation}" returned invalid JSON: ${text.slice(0, 500)}`,
            ),
          );
        }
      });

      child.stdin.end(JSON.stringify(payload));
    });
  }

  private buildScript(operation: string): string {
    return String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$payloadText = [Console]::In.ReadToEnd()
$payload = if ([string]::IsNullOrWhiteSpace($payloadText)) {
  [PSCustomObject]@{}
} else {
  $payloadText | ConvertFrom-Json
}

function Get-TopWindows {
  $root = [System.Windows.Automation.AutomationElement]::RootElement
  return $root.FindAll(
    [System.Windows.Automation.TreeScope]::Children,
    [System.Windows.Automation.Condition]::TrueCondition
  )
}

function Get-ProcessName([int]$processId) {
  try {
    return (Get-Process -Id $processId -ErrorAction Stop).ProcessName
  } catch {
    return ''
  }
}

function Test-GoGlobalWindow($window) {
  $title = [string]$window.Current.Name
  $processName = Get-ProcessName $window.Current.ProcessId
  return (
    $title -match '(?i)(App\s*Controller|GO-Global|GraphOn|TOTVS\s*Cloud\s*[-–—]\s*Linha\s*WinThor)' -or
    $processName -match '(?i)(AppController|gg-client|goglobal)'
  )
}

function Get-GoGlobalLoginWindow {
  foreach ($window in (Get-TopWindows)) {
    $title = [string]$window.Current.Name
    if ($title -match '(?i)^\s*TOTVS\s*Cloud\s*[-–—]\s*Linha\s*WinThor(?:\s.*)?$') {
      return $window
    }
  }
  return $null
}

function Get-GoGlobalWindows {
  $result = @()
  foreach ($window in (Get-TopWindows)) {
    if (Test-GoGlobalWindow $window) {
      $result += $window
    }
  }
  return $result
}

function Get-WinThorWindow {
  foreach ($window in (Get-TopWindows)) {
    $title = [string]$window.Current.Name
    if ($title -match '(?i)^\s*TOTVS\s*Cloud\s*[-–—]\s*Linha\s*WinThor(?:\s.*)?$') {
      continue
    }
    if ($title -match '(?i)WinThor') {
      return $window
    }
  }
  return $null
}

function Get-Descendants($window) {
  return $window.FindAll(
    [System.Windows.Automation.TreeScope]::Descendants,
    [System.Windows.Automation.Condition]::TrueCondition
  )
}

function Get-ElementsByType($window, [string]$controlTypeName) {
  $items = @()
  foreach ($element in (Get-Descendants $window)) {
    if ($element.Current.ControlType.ProgrammaticName -eq "ControlType.$controlTypeName") {
      $items += $element
    }
  }
  return $items
}

function Find-NamedElement($window, [string]$pattern, [string[]]$allowedTypes) {
  foreach ($element in (Get-Descendants $window)) {
    $name = [string]$element.Current.Name
    $automationId = [string]$element.Current.AutomationId
    $type = [string]$element.Current.ControlType.ProgrammaticName
    if (
      ($name -match $pattern -or $automationId -match $pattern) -and
      ($allowedTypes.Count -eq 0 -or $allowedTypes -contains $type)
    ) {
      return $element
    }
  }
  return $null
}

function Set-ElementValue($element, [string]$value) {
  $pattern = $null
  if (-not $element.TryGetCurrentPattern(
    [System.Windows.Automation.ValuePattern]::Pattern,
    [ref]$pattern
  )) {
    throw "Control '$($element.Current.Name)' does not expose ValuePattern."
  }
  ([System.Windows.Automation.ValuePattern]$pattern).SetValue($value)
}

function Invoke-Element($element) {
  $pattern = $null
  if ($element.TryGetCurrentPattern(
    [System.Windows.Automation.InvokePattern]::Pattern,
    [ref]$pattern
  )) {
    ([System.Windows.Automation.InvokePattern]$pattern).Invoke()
    return
  }

  if ($element.TryGetCurrentPattern(
    [System.Windows.Automation.SelectionItemPattern]::Pattern,
    [ref]$pattern
  )) {
    ([System.Windows.Automation.SelectionItemPattern]$pattern).Select()
    return
  }

  throw "Control '$($element.Current.Name)' cannot be invoked or selected."
}

function Get-LoginWindow {
  $goGlobalLogin = Get-GoGlobalLoginWindow
  if ($null -ne $goGlobalLogin) { return $goGlobalLogin }

  foreach ($window in (Get-GoGlobalWindows)) {
    $edits = @(Get-ElementsByType $window 'Edit')
    if ($edits.Count -lt 2) { continue }

    $text = @(
      [string]$window.Current.Name
      foreach ($element in (Get-Descendants $window)) {
        [string]$element.Current.Name
      }
    ) -join ' '

    if ($text -match '(?i)(password|senha|user\s*name|username|usu[aá]rio|login|logon)') {
      return $window
    }
  }
  return $null
}

function Get-ClientWindow {
  $windows = @(Get-GoGlobalWindows)
  if ($windows.Count -gt 0) { return $windows[0] }
  return $null
}

function Test-HostConnectScreen($window) {
  $hostEdit = Find-NamedElement $window '(?i)(host|address|endere[cç]o|servidor)' @('ControlType.Edit')
  $connectButton = Find-NamedElement $window '(?i)^(connect|conectar)$' @('ControlType.Button')
  if ($null -ne $hostEdit -and $null -ne $connectButton) { return $true }

  $edits = @(Get-ElementsByType $window 'Edit')
  return ($edits.Count -eq 1 -and $null -ne $connectButton)
}

function Write-Result($value) {
  $value | ConvertTo-Json -Depth 5 -Compress
}

$operation = '${operation}'

switch ($operation) {
  'findClient' {
    $window = Get-ClientWindow
    if ($null -eq $window) {
      Write-Result ([PSCustomObject]@{ found = $false })
      break
    }
    Write-Result ([PSCustomObject]@{
      found = $true
      processId = $window.Current.ProcessId
      processName = Get-ProcessName $window.Current.ProcessId
      title = [string]$window.Current.Name
    })
  }

  'launchClient' {
    $configuredPath = [string]$payload.executablePath
    $targetHost = [string]$payload.host
    $applicationName = [string]$payload.applicationName
    $launched = $false
    $source = $null
    $launchArguments = @()

    if (-not [string]::IsNullOrWhiteSpace($targetHost)) {
      $launchArguments += @('-h', $targetHost)
    }
    if (-not [string]::IsNullOrWhiteSpace($applicationName)) {
      $launchArguments += @('-a', $applicationName)
    }

    function Start-AppControllerProcess([string]$filePath) {
      if ($launchArguments.Count -gt 0) {
        Start-Process -FilePath $filePath -ArgumentList $launchArguments | Out-Null
      } else {
        Start-Process -FilePath $filePath | Out-Null
      }
    }

    if (-not [string]::IsNullOrWhiteSpace($configuredPath)) {
      if (-not (Test-Path -LiteralPath $configuredPath)) {
        throw "Configured App Controller path does not exist: $configuredPath"
      }
      Start-AppControllerProcess $configuredPath
      $launched = $true
      $source = $configuredPath
    }

    if (-not $launched) {
      $command = Get-Command 'AppController.exe' -ErrorAction SilentlyContinue
      if ($null -ne $command) {
        Start-AppControllerProcess $command.Source
        $launched = $true
        $source = $command.Source
      }
    }

    if (-not $launched) {
      $shortcutRoots = @(
        (Join-Path $env:ProgramData 'Microsoft\Windows\Start Menu\Programs'),
        (Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs')
      )
      foreach ($root in $shortcutRoots) {
        if (-not (Test-Path $root)) { continue }
        $shortcut = Get-ChildItem -Path $root -Filter '*AppController*.lnk' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($null -ne $shortcut) {
          Start-AppControllerProcess $shortcut.FullName
          $launched = $true
          $source = $shortcut.FullName
          break
        }
      }
    }

    if (-not $launched) {
      throw 'AppController.exe was not found. Set WINAUT_GOGLOBAL_APP_CONTROLLER_PATH or install App Controller for the Windows user running Orquestra Agent.'
    }

    Write-Result ([PSCustomObject]@{
      launched = $true
      source = $source
      host = $targetHost
      applicationName = $applicationName
    })
  }

  'connectToHost' {
    $window = Get-ClientWindow
    if ($null -eq $window) { throw 'App Controller window was not found.' }

    $targetHost = [string]$payload.host
    if ([string]::IsNullOrWhiteSpace($targetHost)) { throw 'GO-Global host is empty.' }

    $edit = Find-NamedElement $window '(?i)(host|address|endere[cç]o|servidor)' @('ControlType.Edit')
    if ($null -eq $edit) {
      $edits = @(Get-ElementsByType $window 'Edit')
      if ($edits.Count -eq 0) { throw 'Host Address input was not found in App Controller.' }
      $edit = $edits[0]
    }
    Set-ElementValue $edit $targetHost

    $button = Find-NamedElement $window '(?i)^(connect|conectar)$' @('ControlType.Button')
    if ($null -eq $button) { throw 'Connect button was not found in App Controller.' }
    Invoke-Element $button
    Write-Result ([PSCustomObject]@{ connected = $true })
  }

  'inspectState' {
    $goGlobalLogin = Get-GoGlobalLoginWindow
    if ($null -ne $goGlobalLogin) {
      Write-Result ([PSCustomObject]@{
        state = '${GoGlobalDesktopState.LOGIN_REQUIRED}'
        windowTitle = [string]$goGlobalLogin.Current.Name
      })
      break
    }

    $login = Get-LoginWindow
    if ($null -ne $login) {
      Write-Result ([PSCustomObject]@{
        state = '${GoGlobalDesktopState.LOGIN_REQUIRED}'
        windowTitle = [string]$login.Current.Name
      })
      break
    }

    $winThor = Get-WinThorWindow
    if ($null -ne $winThor) {
      Write-Result ([PSCustomObject]@{
        state = '${GoGlobalDesktopState.WINTHOR_READY}'
        windowTitle = [string]$winThor.Current.Name
      })
      break
    }

    $client = Get-ClientWindow
    if ($null -eq $client) {
      throw 'App Controller / GO-Global window was not found.'
    }

    $state = if (Test-HostConnectScreen $client) {
      '${GoGlobalDesktopState.CLIENT_READY}'
    } else {
      '${GoGlobalDesktopState.APPLICATION_CATALOG}'
    }

    Write-Result ([PSCustomObject]@{
      state = $state
      windowTitle = [string]$client.Current.Name
    })
  }

  'authenticate' {
    $window = Get-GoGlobalLoginWindow
    if ($null -eq $window) { $window = Get-LoginWindow }
    if ($null -eq $window) { throw 'GO-Global login window was not found.' }

    $edits = @()
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
      $edits = @(Get-ElementsByType $window 'Edit')
      if ($edits.Count -ge 2) { break }
      Start-Sleep -Milliseconds 250
    }
    $usernameEdit = Find-NamedElement $window '(?i)(user\s*name|username|usu[aá]rio|login)' @('ControlType.Edit')
    $passwordEdit = Find-NamedElement $window '(?i)(password|senha|pass)' @('ControlType.Edit')

    if ($null -eq $usernameEdit -and $edits.Count -ge 1) { $usernameEdit = $edits[0] }
    if ($null -eq $passwordEdit -and $edits.Count -ge 2) { $passwordEdit = $edits[1] }
    if ($null -eq $usernameEdit -or $null -eq $passwordEdit) {
      throw 'Username/password inputs were not found in GO-Global login.'
    }

    Set-ElementValue $usernameEdit ([string]$payload.username)
    Set-ElementValue $passwordEdit ([string]$payload.password)

    $button = Find-NamedElement $window '(?i)^(login|logon|sign\s*in|entrar|ok|connect|conectar)$' @('ControlType.Button')
    if ($null -eq $button) { throw 'Login button was not found in GO-Global.' }
    Invoke-Element $button
    Write-Result ([PSCustomObject]@{ authenticated = $true })
  }

  'launchApplication' {
    if ($null -ne (Get-WinThorWindow)) {
      Write-Result ([PSCustomObject]@{ launched = $false; alreadyOpen = $true })
      break
    }

    $applicationName = [string]$payload.applicationName
    if ([string]::IsNullOrWhiteSpace($applicationName)) { $applicationName = 'WinThor' }
    $escaped = [regex]::Escape($applicationName)

    foreach ($window in (Get-GoGlobalWindows)) {
      $element = Find-NamedElement $window "(?i)$escaped" @(
        'ControlType.Button',
        'ControlType.ListItem',
        'ControlType.Hyperlink'
      )
      if ($null -ne $element) {
        Invoke-Element $element
        Write-Result ([PSCustomObject]@{ launched = $true; applicationName = $applicationName })
        exit 0
      }
    }

    throw "Remote application '$applicationName' was not found in the GO-Global application catalog."
  }

  'openRoutine' {
    $window = Get-WinThorWindow
    if ($null -eq $window) { throw 'WinThor window was not found inside GO-Global.' }

    $routineCode = [int]$payload.routineCode
    $shell = New-Object -ComObject WScript.Shell
    if (-not $shell.AppActivate($window.Current.ProcessId)) {
      throw "Could not activate WinThor process $($window.Current.ProcessId)."
    }
    Start-Sleep -Milliseconds 200
    $shell.SendKeys([string]$routineCode)
    $shell.SendKeys('{ENTER}')
    Write-Result ([PSCustomObject]@{ opened = $true; routineCode = $routineCode })
  }

  'closeSession' {
    $closed = 0
    foreach ($window in (Get-TopWindows)) {
      if ((Test-GoGlobalWindow $window) -or ([string]$window.Current.Name -match '(?i)WinThor')) {
        $pattern = $null
        if ($window.TryGetCurrentPattern(
          [System.Windows.Automation.WindowPattern]::Pattern,
          [ref]$pattern
        )) {
          try {
            ([System.Windows.Automation.WindowPattern]$pattern).Close()
            $closed++
          } catch {}
        }
      }
    }
    Write-Result ([PSCustomObject]@{ closedWindows = $closed })
  }

  default {
    throw "Unsupported App Controller operation: $operation"
  }
}
`;
  }
}
