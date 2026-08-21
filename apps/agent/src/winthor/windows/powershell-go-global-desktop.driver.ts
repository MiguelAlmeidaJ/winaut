import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

const DEFAULT_COMMAND_TIMEOUT_MS = 60_000;

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

  async authenticate(
    username: string,
    password: string,
    allowOpaqueFallback = false,
  ): Promise<void> {
    await this.run('authenticate', {
      username,
      password,
      allowOpaqueFallback,
    });
  }

  async launchApplication(
    applicationName: string,
    allowOpaqueFallback = false,
  ): Promise<void> {
    await this.run('launchApplication', {
      applicationName,
      allowOpaqueFallback,
    });
  }

  async authenticateWinThor(
    username: string,
    password: string,
  ): Promise<void> {
    await this.run('authenticateWinThor', { username, password });
  }

  async openRoutine(
    routineCode: number,
    allowOpaqueFallback = false,
  ): Promise<void> {
    await this.run('openRoutine', {
      routineCode,
      allowOpaqueFallback,
    });
  }

  async closeSession(processId?: number | null): Promise<void> {
    await this.run('closeSession', { processId: processId ?? null });
  }

  private async run(
    operation: string,
    payload: Record<string, unknown> = {},
  ): Promise<PowerShellResult> {
    if (process.platform !== 'win32') {
      throw new Error(
        `GO_GLOBAL desktop automation requires Windows (current platform: ${process.platform}).`,
      );
    }

    const script = this.buildScript(operation);
    const temporaryDirectory = await mkdtemp(
      join(tmpdir(), 'orquestra-goglobal-'),
    );
    const scriptPath = join(temporaryDirectory, 'operation.ps1');

    try {
      await writeFile(scriptPath, `\uFEFF${script}`, 'utf8');

      return await new Promise<PowerShellResult>((resolve, reject) => {
        const child = spawn(
          'powershell.exe',
          [
            '-NoLogo',
            '-NoProfile',
            '-NonInteractive',
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            scriptPath,
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

        child.stdin.end(
          Buffer.from(JSON.stringify(payload), 'utf8').toString('base64'),
        );
      });
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }

  private buildScript(operation: string): string {
    return String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

public sealed class OrquestraWin32ControlInfo {
  public IntPtr Handle;
  public string ClassName;
  public string Text;
  public int Left;
  public int Top;
}

public static class OrquestraWin32LoginNative {
  private const uint WM_SETTEXT = 0x000C;
  private const uint WM_CLOSE = 0x0010;
  private const uint BM_CLICK = 0x00F5;
  private const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
  private const uint MOUSEEVENTF_LEFTUP = 0x0004;
  private const uint INPUT_KEYBOARD = 1;
  private const uint KEYEVENTF_KEYUP = 0x0002;
  private const uint KEYEVENTF_UNICODE = 0x0004;
  private const ushort VK_BACK = 0x08;
  private const ushort VK_SHIFT = 0x10;
  private const ushort VK_CONTROL = 0x11;
  private const ushort VK_MENU = 0x12;
  private const ushort VK_CAPITAL = 0x14;
  private const ushort VK_A = 0x41;

  private delegate bool EnumChildProc(IntPtr hWnd, IntPtr lParam);

  [StructLayout(LayoutKind.Sequential)]
  private struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }

  [StructLayout(LayoutKind.Sequential)]
  private struct MOUSEINPUT {
    public int dx;
    public int dy;
    public uint mouseData;
    public uint dwFlags;
    public uint time;
    public IntPtr dwExtraInfo;
  }

  [StructLayout(LayoutKind.Sequential)]
  private struct KEYBDINPUT {
    public ushort wVk;
    public ushort wScan;
    public uint dwFlags;
    public uint time;
    public IntPtr dwExtraInfo;
  }

  [StructLayout(LayoutKind.Sequential)]
  private struct HARDWAREINPUT {
    public uint uMsg;
    public ushort wParamL;
    public ushort wParamH;
  }

  [StructLayout(LayoutKind.Explicit)]
  private struct InputUnion {
    [FieldOffset(0)] public MOUSEINPUT mi;
    [FieldOffset(0)] public KEYBDINPUT ki;
    [FieldOffset(0)] public HARDWAREINPUT hi;
  }

  [StructLayout(LayoutKind.Sequential)]
  private struct INPUT {
    public uint type;
    public InputUnion U;
  }

  [DllImport("user32.dll")]
  private static extern bool EnumChildWindows(
    IntPtr hWndParent,
    EnumChildProc lpEnumFunc,
    IntPtr lParam
  );

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  private static extern int GetClassNameW(
    IntPtr hWnd,
    StringBuilder lpClassName,
    int nMaxCount
  );

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  private static extern int GetWindowTextW(
    IntPtr hWnd,
    StringBuilder lpString,
    int nMaxCount
  );

  [DllImport("user32.dll")]
  private static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

  [DllImport("user32.dll")]
  private static extern IntPtr GetDC(IntPtr hWnd);

  [DllImport("user32.dll")]
  private static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);

  [DllImport("gdi32.dll")]
  private static extern uint GetPixel(IntPtr hdc, int x, int y);

  [DllImport("user32.dll")]
  private static extern bool IsWindowVisible(IntPtr hWnd);

  [DllImport("user32.dll")]
  private static extern bool IsWindow(IntPtr hWnd);

  [DllImport("user32.dll")]
  private static extern bool SetForegroundWindow(IntPtr hWnd);

  [DllImport("user32.dll")]
  private static extern uint GetWindowThreadProcessId(
    IntPtr hWnd,
    out uint processId
  );

  [DllImport("user32.dll")]
  private static extern IntPtr GetKeyboardLayout(uint threadId);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  private static extern short VkKeyScanExW(char character, IntPtr layout);

  [DllImport("user32.dll")]
  private static extern short GetKeyState(int virtualKey);

  [DllImport("user32.dll")]
  private static extern bool SetCursorPos(int x, int y);

  [DllImport("user32.dll")]
  private static extern void mouse_event(
    uint dwFlags,
    uint dx,
    uint dy,
    uint dwData,
    UIntPtr dwExtraInfo
  );

  [DllImport("user32.dll", SetLastError = true)]
  private static extern uint SendInput(
    uint nInputs,
    INPUT[] pInputs,
    int cbSize
  );

  [DllImport(
    "user32.dll",
    CharSet = CharSet.Unicode,
    EntryPoint = "SendMessageW"
  )]
  private static extern IntPtr SendMessageText(
    IntPtr hWnd,
    uint msg,
    IntPtr wParam,
    string lParam
  );

  [DllImport("user32.dll", EntryPoint = "SendMessageW")]
  private static extern IntPtr SendMessage(
    IntPtr hWnd,
    uint msg,
    IntPtr wParam,
    IntPtr lParam
  );

  [DllImport("user32.dll", EntryPoint = "PostMessageW")]
  private static extern bool PostMessage(
    IntPtr hWnd,
    uint msg,
    IntPtr wParam,
    IntPtr lParam
  );

  public static OrquestraWin32ControlInfo[] GetChildControls(IntPtr parent) {
    var controls = new List<OrquestraWin32ControlInfo>();

    EnumChildWindows(
      parent,
      delegate(IntPtr hWnd, IntPtr lParam) {
        if (!IsWindowVisible(hWnd)) {
          return true;
        }

        var className = new StringBuilder(256);
        var text = new StringBuilder(512);
        RECT rect;

        GetClassNameW(hWnd, className, className.Capacity);
        GetWindowTextW(hWnd, text, text.Capacity);
        GetWindowRect(hWnd, out rect);

        controls.Add(new OrquestraWin32ControlInfo {
          Handle = hWnd,
          ClassName = className.ToString(),
          Text = text.ToString(),
          Left = rect.Left,
          Top = rect.Top
        });

        return true;
      },
      IntPtr.Zero
    );

    return controls.ToArray();
  }

  public static void SetText(IntPtr hWnd, string value) {
    SendMessageText(hWnd, WM_SETTEXT, IntPtr.Zero, value);
  }

  public static void Click(IntPtr hWnd) {
    SendMessage(hWnd, BM_CLICK, IntPtr.Zero, IntPtr.Zero);
  }

  public static bool CloseWindow(IntPtr hWnd) {
    return IsWindow(hWnd) &&
      PostMessage(hWnd, WM_CLOSE, IntPtr.Zero, IntPtr.Zero);
  }

  public static bool IsExistingWindow(IntPtr hWnd) {
    return IsWindow(hWnd);
  }

  public static bool IsExpectedOpaqueLoginWindow(IntPtr hWnd) {
    RECT rect;
    if (!IsWindow(hWnd) || !GetWindowRect(hWnd, out rect)) {
      return false;
    }

    var width = rect.Right - rect.Left;
    var height = rect.Bottom - rect.Top;
    return width >= 360 && width <= 800 && height >= 220 && height <= 500;
  }

  public static bool ClickRelative(IntPtr hWnd, double xRatio, double yRatio) {
    RECT rect;
    if (!IsExpectedOpaqueLoginWindow(hWnd) || !GetWindowRect(hWnd, out rect)) {
      return false;
    }

    SetForegroundWindow(hWnd);
    Thread.Sleep(100);

    var width = rect.Right - rect.Left;
    var height = rect.Bottom - rect.Top;
    var x = rect.Left + (int)Math.Round(width * xRatio);
    var y = rect.Top + (int)Math.Round(height * yRatio);

    SetCursorPos(x, y);
    mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
    mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
    Thread.Sleep(100);
    return true;
  }

  public static bool DoubleClickLargeWindowRelative(
    IntPtr hWnd,
    double xRatio,
    double yRatio
  ) {
    RECT rect;
    if (!IsWindow(hWnd) || !GetWindowRect(hWnd, out rect)) {
      return false;
    }

    var width = rect.Right - rect.Left;
    var height = rect.Bottom - rect.Top;
    if (width < 1000 || height < 600) {
      return false;
    }

    SetForegroundWindow(hWnd);
    Thread.Sleep(150);

    var x = rect.Left + (int)Math.Round(width * xRatio);
    var y = rect.Top + (int)Math.Round(height * yRatio);
    SetCursorPos(x, y);

    for (var click = 0; click < 2; click++) {
      mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
      mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
      Thread.Sleep(100);
    }

    return true;
  }

  public static bool ClickLargeWindowRelative(
    IntPtr hWnd,
    double xRatio,
    double yRatio
  ) {
    RECT rect;
    if (!IsWindow(hWnd) || !GetWindowRect(hWnd, out rect)) {
      return false;
    }

    var width = rect.Right - rect.Left;
    var height = rect.Bottom - rect.Top;
    if (width < 1000 || height < 600) {
      return false;
    }

    SetForegroundWindow(hWnd);
    Thread.Sleep(150);

    var x = rect.Left + (int)Math.Round(width * xRatio);
    var y = rect.Top + (int)Math.Round(height * yRatio);
    SetCursorPos(x, y);
    mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
    mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
    Thread.Sleep(100);
    return true;
  }

  public static bool HasCentralVisualContent(IntPtr hWnd) {
    RECT rect;
    if (!IsWindow(hWnd) || !GetWindowRect(hWnd, out rect)) {
      return false;
    }

    var width = rect.Right - rect.Left;
    var height = rect.Bottom - rect.Top;
    if (width < 1000 || height < 600) {
      return false;
    }

    var screenDc = GetDC(IntPtr.Zero);
    if (screenDc == IntPtr.Zero) {
      return false;
    }

    var nonWhiteSamples = 0;
    try {
      const int columns = 36;
      const int rows = 32;
      for (var column = 0; column < columns; column++) {
        var relativeX = 0.34 + (0.32 * column / (columns - 1));
        var x = rect.Left + (int)Math.Round(width * relativeX);

        for (var row = 0; row < rows; row++) {
          var relativeY = 0.28 + (0.40 * row / (rows - 1));
          var y = rect.Top + (int)Math.Round(height * relativeY);
          var color = GetPixel(screenDc, x, y);
          if (color == 0xFFFFFFFF) {
            continue;
          }

          var red = (int)(color & 0xFF);
          var green = (int)((color >> 8) & 0xFF);
          var blue = (int)((color >> 16) & 0xFF);
          if (red < 238 || green < 238 || blue < 238) {
            nonWhiteSamples++;
            if (nonWhiteSamples >= 18) {
              return true;
            }
          }
        }
      }
    } finally {
      ReleaseDC(IntPtr.Zero, screenDc);
    }

    return false;
  }

  private static void SendVirtualKey(ushort key, bool keyUp) {
    var input = new INPUT {
      type = INPUT_KEYBOARD,
      U = new InputUnion {
        ki = new KEYBDINPUT {
          wVk = key,
          wScan = 0,
          dwFlags = keyUp ? KEYEVENTF_KEYUP : 0,
          time = 0,
          dwExtraInfo = IntPtr.Zero
        }
      }
    };

    if (SendInput(1, new[] { input }, Marshal.SizeOf(typeof(INPUT))) != 1) {
      throw new InvalidOperationException("SendInput virtual-key operation failed.");
    }
  }

  private static void SendUnicodeCharacter(char character) {
    var down = new INPUT {
      type = INPUT_KEYBOARD,
      U = new InputUnion {
        ki = new KEYBDINPUT {
          wVk = 0,
          wScan = character,
          dwFlags = KEYEVENTF_UNICODE,
          time = 0,
          dwExtraInfo = IntPtr.Zero
        }
      }
    };
    var up = down;
    up.U.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;
    if (SendInput(
      2,
      new[] { down, up },
      Marshal.SizeOf(typeof(INPUT))
    ) != 2) {
      throw new InvalidOperationException("SendInput Unicode text operation failed.");
    }
  }

  private static void SendTextAsPhysicalKeys(
    IntPtr targetWindow,
    string value
  ) {
    uint processId;
    var threadId = GetWindowThreadProcessId(targetWindow, out processId);
    var layout = GetKeyboardLayout(threadId);
    var capsLockWasOn = (GetKeyState(VK_CAPITAL) & 1) != 0;

    if (capsLockWasOn) {
      SendVirtualKey(VK_CAPITAL, false);
      SendVirtualKey(VK_CAPITAL, true);
      Thread.Sleep(25);
    }

    try {
      foreach (var character in value) {
        var mapping = VkKeyScanExW(character, layout);

        if (mapping == -1) {
          SendUnicodeCharacter(character);
          Thread.Sleep(80);
          continue;
        }

        var key = (ushort)(mapping & 0xff);
        var modifiers = (byte)((mapping >> 8) & 0xff);
        var shift = (modifiers & 1) != 0;
        var control = (modifiers & 2) != 0;
        var alt = (modifiers & 4) != 0;

        if (control) SendVirtualKey(VK_CONTROL, false);
        if (alt) SendVirtualKey(VK_MENU, false);
        if (shift) SendVirtualKey(VK_SHIFT, false);

        SendVirtualKey(key, false);
        SendVirtualKey(key, true);

        if (shift) SendVirtualKey(VK_SHIFT, true);
        if (alt) SendVirtualKey(VK_MENU, true);
        if (control) SendVirtualKey(VK_CONTROL, true);

        Thread.Sleep(80);
      }
    } finally {
      if (capsLockWasOn) {
        SendVirtualKey(VK_CAPITAL, false);
        SendVirtualKey(VK_CAPITAL, true);
      }
    }
  }

  public static void ReplaceFocusedText(IntPtr targetWindow, string value) {
    SendVirtualKey(VK_CONTROL, false);
    SendVirtualKey(VK_A, false);
    SendVirtualKey(VK_A, true);
    SendVirtualKey(VK_CONTROL, true);
    Thread.Sleep(50);
    for (var index = 0; index < 128; index++) {
      SendVirtualKey(VK_BACK, false);
      SendVirtualKey(VK_BACK, true);
    }
    Thread.Sleep(50);
    SendTextAsPhysicalKeys(targetWindow, value);
    Thread.Sleep(250);
  }
}
'@

$payloadBase64 = [Console]::In.ReadToEnd().Trim()
$payloadText = if ([string]::IsNullOrWhiteSpace($payloadBase64)) {
  ''
} else {
  [System.Text.Encoding]::UTF8.GetString(
    [System.Convert]::FromBase64String($payloadBase64)
  )
}
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

function Get-OpaqueGoGlobalLoginWindow {
  foreach ($window in (Get-GoGlobalWindows)) {
    $edits = @(Get-ElementsByType $window 'Edit')
    $buttons = @(Get-ElementsByType $window 'Button')
    if ($edits.Count -ge 2 -and $buttons.Count -ge 1) {
      return $window
    }
  }
  return $null
}

function Get-Win32LoginControls($window) {
  $handle = [IntPtr]$window.Current.NativeWindowHandle
  if ($handle -eq [IntPtr]::Zero) { return @() }
  return @([OrquestraWin32LoginNative]::GetChildControls($handle))
}

function Get-Win32LoginCandidateWindow {
  foreach ($window in (Get-GoGlobalWindows)) {
    $controls = @(Get-Win32LoginControls $window)
    $edits = @($controls | Where-Object { $_.ClassName -eq 'Edit' })
    $buttons = @($controls | Where-Object { $_.ClassName -eq 'Button' })

    if ($edits.Count -ge 2 -and $buttons.Count -ge 1) {
      return $window
    }
  }

  return $null
}

function Get-OpaqueGoGlobalLoginCandidateWindow {
  foreach ($window in (Get-GoGlobalWindows)) {
    $handle = [IntPtr]$window.Current.NativeWindowHandle
    if (
      $handle -ne [IntPtr]::Zero -and
      [OrquestraWin32LoginNative]::IsExpectedOpaqueLoginWindow($handle)
    ) {
      return $window
    }
  }

  return $null
}

function Invoke-Win32GoGlobalLogin(
  $window,
  [string]$username,
  [string]$password
) {
  $handle = [IntPtr]$window.Current.NativeWindowHandle
  if ($handle -eq [IntPtr]::Zero) {
    throw 'GO-Global login window does not expose a native window handle.'
  }

  $controls = @(Get-Win32LoginControls $window)
  $edits = @(
    $controls |
      Where-Object { $_.ClassName -eq 'Edit' } |
      Sort-Object Top, Left
  )
  $buttons = @(
    $controls |
      Where-Object { $_.ClassName -eq 'Button' } |
      Sort-Object Left, Top
  )

  if ($edits.Count -lt 2 -or $buttons.Count -lt 1) {
    throw "Win32 child-control fallback found only $($edits.Count) Edit control(s) and $($buttons.Count) Button control(s)."
  }

  $loginButton = @(
    $buttons | Where-Object {
      $_.Text -match '(?i)^(connect|conectar|login|logon|entrar|ok)$'
    }
  ) | Select-Object -First 1

  if ($null -eq $loginButton) {
    $loginButton = $buttons[0]
  }

  [OrquestraWin32LoginNative]::SetText($edits[0].Handle, $username)
  [OrquestraWin32LoginNative]::SetText($edits[1].Handle, $password)
  [OrquestraWin32LoginNative]::Click($loginButton.Handle)

  return $handle
}

function Invoke-OpaqueGoGlobalLoginByCoordinates(
  $window,
  [string]$username,
  [string]$password
) {
  $handle = [IntPtr]$window.Current.NativeWindowHandle
  if (
    $handle -eq [IntPtr]::Zero -or
    -not [OrquestraWin32LoginNative]::IsExpectedOpaqueLoginWindow($handle)
  ) {
    throw 'Opaque GO-Global login fallback refused an unexpected window geometry.'
  }

  if (-not [OrquestraWin32LoginNative]::ClickRelative($handle, 0.72, 0.40)) {
    throw 'Could not focus the GO-Global username field.'
  }
  [OrquestraWin32LoginNative]::ReplaceFocusedText($handle, $username)

  if (-not [OrquestraWin32LoginNative]::ClickRelative($handle, 0.72, 0.55)) {
    throw 'Could not focus the GO-Global password field.'
  }
  [OrquestraWin32LoginNative]::ReplaceFocusedText($handle, $password)

  if (-not [OrquestraWin32LoginNative]::ClickRelative($handle, 0.37, 0.81)) {
    throw 'Could not click the GO-Global Connect button.'
  }

  return $handle
}

function Wait-Win32GoGlobalLoginTransition([IntPtr]$handle) {
  if ($handle -eq [IntPtr]::Zero) { return }

  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if (-not [OrquestraWin32LoginNative]::IsExistingWindow($handle)) {
      return
    }

    $controls = @(
      [OrquestraWin32LoginNative]::GetChildControls($handle)
    )
    $edits = @(
      $controls | Where-Object { $_.ClassName -eq 'Edit' }
    )

    if ($edits.Count -lt 2) {
      return
    }

    Start-Sleep -Milliseconds 250
  }

  throw 'GO-Global credentials were submitted, but the native login controls did not transition within 15 seconds.'
}

function Wait-OpaqueGoGlobalLoginTransition([IntPtr]$handle) {
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if (
      -not [OrquestraWin32LoginNative]::IsExistingWindow($handle) -or
      -not [OrquestraWin32LoginNative]::IsExpectedOpaqueLoginWindow($handle)
    ) {
      return
    }

    foreach ($window in (Get-GoGlobalWindows)) {
      $currentHandle = [IntPtr]$window.Current.NativeWindowHandle
      if (
        $currentHandle -eq [IntPtr]::Zero -or
        $currentHandle -eq $handle
      ) {
        continue
      }

      $rect = $window.Current.BoundingRectangle
      if (
        $rect.Width -ge 360 -and
        $rect.Width -le 800 -and
        $rect.Height -ge 120 -and
        $rect.Height -lt 220
      ) {
        throw 'GO-Global rejected the submitted username or password. Update the stored Windows credential and try again.'
      }
    }

    Start-Sleep -Milliseconds 250
  }

  throw 'GO-Global credentials were submitted, but the opaque login window did not close or resize within 15 seconds.'
}

function Get-ClientWindow {
  $windows = @(Get-GoGlobalWindows)
  if ($windows.Count -gt 0) {
    return @(
      $windows | Sort-Object -Property @{
        Expression = {
          $rect = $_.Current.BoundingRectangle
          [double]$rect.Width * [double]$rect.Height
        }
        Descending = $true
      }
    )[0]
  }
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

    $opaqueLogin = Get-OpaqueGoGlobalLoginWindow
    if ($null -ne $opaqueLogin) {
      Write-Result ([PSCustomObject]@{
        state = '${GoGlobalDesktopState.LOGIN_REQUIRED}'
        windowTitle = [string]$opaqueLogin.Current.Name
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
    $allowOpaqueFallback = [bool]$payload.allowOpaqueFallback
    $window = $null

    for ($attempt = 0; $attempt -lt 20; $attempt++) {
      $window = Get-GoGlobalLoginWindow
      if ($null -eq $window) { $window = Get-LoginWindow }
      if ($null -eq $window) { $window = Get-Win32LoginCandidateWindow }
      if ($null -eq $window -and $allowOpaqueFallback) {
        $window = Get-OpaqueGoGlobalLoginCandidateWindow
      }
      if ($null -ne $window) { break }
      Start-Sleep -Milliseconds 250
    }

    if ($null -eq $window) {
      throw 'GO-Global login window was not found by UI Automation, Win32 controls, or the guarded opaque-login fallback.'
    }

    $loginHandle = [IntPtr]$window.Current.NativeWindowHandle
    $edits = @()
    for ($attempt = 0; $attempt -lt 10; $attempt++) {
      $edits = @(Get-ElementsByType $window 'Edit')
      if ($edits.Count -ge 2) { break }
      Start-Sleep -Milliseconds 250
    }
    $usernameEdit = Find-NamedElement $window '(?i)(user\s*name|username|usu[aá]rio|login)' @('ControlType.Edit')
    $passwordEdit = Find-NamedElement $window '(?i)(password|senha|pass)' @('ControlType.Edit')

    if ($null -eq $usernameEdit -and $edits.Count -ge 1) { $usernameEdit = $edits[0] }
    if ($null -eq $passwordEdit -and $edits.Count -ge 2) { $passwordEdit = $edits[1] }

    $submitted = $false
    $usedOpaqueFallback = $false

    if ($null -ne $usernameEdit -and $null -ne $passwordEdit) {
      $button = Find-NamedElement $window '(?i)^(login|logon|sign\s*in|entrar|ok|connect|conectar)$' @('ControlType.Button')
      if ($null -ne $button) {
        Set-ElementValue $usernameEdit ([string]$payload.username)
        Set-ElementValue $passwordEdit ([string]$payload.password)
        Invoke-Element $button
        $submitted = $true
      }
    }

    if (-not $submitted) {
      try {
        $loginHandle = Invoke-Win32GoGlobalLogin $window ([string]$payload.username) ([string]$payload.password)
        $submitted = $true
      } catch {
        if (-not $allowOpaqueFallback) { throw }

        $loginHandle = Invoke-OpaqueGoGlobalLoginByCoordinates $window ([string]$payload.username) ([string]$payload.password)
        $submitted = $true
        $usedOpaqueFallback = $true
      }
    }

    if ($usedOpaqueFallback) {
      Wait-OpaqueGoGlobalLoginTransition $loginHandle
    } else {
      Wait-Win32GoGlobalLoginTransition $loginHandle
    }

    Write-Result ([PSCustomObject]@{
      authenticated = $true
      opaqueFallback = $usedOpaqueFallback
    })
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

    $allowOpaqueFallback = [bool]$payload.allowOpaqueFallback
    if ($allowOpaqueFallback) {
      $catalogWindow = $null
      for ($attempt = 0; $attempt -lt 40; $attempt++) {
        $candidate = Get-ClientWindow
        if ($null -ne $candidate) {
          $rect = $candidate.Current.BoundingRectangle
          if ($rect.Width -ge 1000 -and $rect.Height -ge 600) {
            $catalogWindow = $candidate
            break
          }
        }
        Start-Sleep -Milliseconds 250
      }

      if ($null -eq $catalogWindow) {
        throw 'Opaque GO-Global application catalog did not become ready within 10 seconds.'
      }

      $catalogHandle = [IntPtr]$catalogWindow.Current.NativeWindowHandle
      if (-not [OrquestraWin32LoginNative]::DoubleClickLargeWindowRelative(
        $catalogHandle,
        0.417,
        0.120
      )) {
        throw 'Opaque GO-Global application catalog fallback refused an unexpected window geometry.'
      }

      Start-Sleep -Milliseconds 1500
      Write-Result ([PSCustomObject]@{
        launched = $true
        applicationName = $applicationName
        opaqueFallback = $true
      })
      break
    }

    throw "Remote application '$applicationName' was not found in the GO-Global application catalog."
  }

  'authenticateWinThor' {
    Start-Sleep -Milliseconds 5000
    $window = $null
    for ($attempt = 0; $attempt -lt 140; $attempt++) {
      $candidate = Get-ClientWindow
      if ($null -ne $candidate) {
        $rect = $candidate.Current.BoundingRectangle
        $candidateHandle = [IntPtr]$candidate.Current.NativeWindowHandle
        if (
          $rect.Width -ge 1000 -and
          $rect.Height -ge 600 -and
          [OrquestraWin32LoginNative]::HasCentralVisualContent($candidateHandle)
        ) {
          $window = $candidate
          break
        }
      }
      Start-Sleep -Milliseconds 250
    }

    if ($null -eq $window) {
      throw 'WinThor internal login did not become ready after GO-Global access verification.'
    }

    $handle = [IntPtr]$window.Current.NativeWindowHandle
    if (-not [OrquestraWin32LoginNative]::ClickLargeWindowRelative(
      $handle,
      0.516,
      0.438
    )) {
      throw 'WinThor internal login fallback refused an unexpected window geometry.'
    }
    [OrquestraWin32LoginNative]::ReplaceFocusedText(
      $handle,
      ([string]$payload.username)
    )

    if (-not [OrquestraWin32LoginNative]::ClickLargeWindowRelative(
      $handle,
      0.516,
      0.471
    )) {
      throw 'Could not focus the WinThor internal password field.'
    }
    [OrquestraWin32LoginNative]::ReplaceFocusedText(
      $handle,
      ([string]$payload.password)
    )

    if (-not [OrquestraWin32LoginNative]::ClickLargeWindowRelative(
      $handle,
      0.500,
      0.638
    )) {
      throw 'Could not click the WinThor internal Enter button.'
    }

    Start-Sleep -Milliseconds 5000
    Write-Result ([PSCustomObject]@{
      authenticated = $true
      opaqueFallback = $true
    })
  }

  'openRoutine' {
    $window = Get-WinThorWindow
    if ($null -eq $window -and [bool]$payload.allowOpaqueFallback) {
      $window = Get-ClientWindow
    }
    if ($null -eq $window) {
      throw 'WinThor window was not found inside GO-Global.'
    }

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
    $ownedProcessId = [int]$payload.processId
    foreach ($window in (Get-TopWindows)) {
      if ((Test-GoGlobalWindow $window) -or ([string]$window.Current.Name -match '(?i)WinThor')) {
        if (
          $ownedProcessId -gt 0 -and
          $window.Current.ProcessId -ne $ownedProcessId
        ) {
          continue
        }

        $closedWindow = $false
        $pattern = $null
        if ($window.TryGetCurrentPattern(
          [System.Windows.Automation.WindowPattern]::Pattern,
          [ref]$pattern
        )) {
          try {
            ([System.Windows.Automation.WindowPattern]$pattern).Close()
            $closedWindow = $true
          } catch {}
        }

        if (-not $closedWindow) {
          $handle = [IntPtr]$window.Current.NativeWindowHandle
          $closedWindow = [OrquestraWin32LoginNative]::CloseWindow($handle)
        }

        if ($closedWindow) { $closed++ }
      }
    }

    $terminatedOwnedProcess = $false
    if ($ownedProcessId -gt 0) {
      Start-Sleep -Milliseconds 500
      $ownedProcess = Get-Process -Id $ownedProcessId -ErrorAction SilentlyContinue
      if (
        $null -ne $ownedProcess -and
        $ownedProcess.ProcessName -match '(?i)^(AppController|gg-client|goglobal)$'
      ) {
        Stop-Process -Id $ownedProcessId -Force
        $terminatedOwnedProcess = $true
      }
    }

    Write-Result ([PSCustomObject]@{
      closedWindows = $closed
      terminatedOwnedProcess = $terminatedOwnedProcess
    })
  }

  default {
    throw "Unsupported App Controller operation: $operation"
  }
}
`;
  }
}
