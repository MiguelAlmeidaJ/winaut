import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PowerShellGoGlobalDesktopDriver } from './powershell-go-global-desktop.driver.js';

describe('PowerShellGoGlobalDesktopDriver', () => {
  it('does not assign to the reserved PowerShell Host variable', () => {
    const driver = new PowerShellGoGlobalDesktopDriver();
    const script = (
      driver as unknown as {
        buildScript(operation: string): string;
      }
    ).buildScript('connectToHost');

    assert.match(script, /\$targetHost = \[string\]\$payload\.host/);
    assert.match(script, /Set-ElementValue \$edit \$targetHost/);
    assert.doesNotMatch(script, /^\s*\$host\s*=/im);
  });

  it('recognizes the TOTVS Cloud WinThor login before a generic WinThor window', () => {
    const driver = new PowerShellGoGlobalDesktopDriver();
    const script = (
      driver as unknown as {
        buildScript(operation: string): string;
      }
    ).buildScript('inspectState');

    assert.ok(
      script.includes('TOTVS\\s*Cloud\\s*[-–—]\\s*Linha\\s*WinThor'),
    );

    const loginIndex = script.indexOf('$login = Get-LoginWindow');
    const winThorIndex = script.indexOf('$winThor = Get-WinThorWindow');
    assert.ok(loginIndex >= 0);
    assert.ok(winThorIndex >= 0);
    assert.ok(loginIndex < winThorIndex);
  });

  it('never treats the short TOTVS Cloud login window as WinThor ready', () => {
    const driver = new PowerShellGoGlobalDesktopDriver();
    const inspectScript = (
      driver as unknown as {
        buildScript(operation: string): string;
      }
    ).buildScript('inspectState');
    const authenticateScript = (
      driver as unknown as {
        buildScript(operation: string): string;
      }
    ).buildScript('authenticate');

    assert.match(
      inspectScript,
      /function Get-GoGlobalLoginWindow[\s\S]*TOTVS\\s\*Cloud/,
    );
    assert.match(
      inspectScript,
      /\$goGlobalLogin = Get-GoGlobalLoginWindow[\s\S]*LOGIN_REQUIRED/,
    );
    assert.match(inspectScript, /Get-WinThorWindow[\s\S]*continue/);
    assert.match(
      inspectScript,
      /TOTVS\\s\*Cloud\\s\*\[-–—\]\\s\*Linha\\s\*WinThor/,
    );
    assert.match(authenticateScript, /for \(\$attempt = 0; \$attempt -lt 20;/);
  });

  it('passes Host Address and published application to AppController launch', () => {
    const driver = new PowerShellGoGlobalDesktopDriver();
    const script = (
      driver as unknown as {
        buildScript(operation: string): string;
      }
    ).buildScript('launchClient');

    assert.match(script, /\$launchArguments \+= @\('-h', \$targetHost\)/);
    assert.match(
      script,
      /\$launchArguments \+= @\('-a', \$applicationName\)/,
    );
    assert.match(
      script,
      /Start-Process -FilePath \$filePath -ArgumentList \$launchArguments/,
    );
  });

  it('guards opaque coordinate login behind the explicit auto-launch flag', () => {
    const driver = new PowerShellGoGlobalDesktopDriver();
    const script = (
      driver as unknown as {
        buildScript(operation: string): string;
      }
    ).buildScript('authenticate');

    assert.match(script, /\$allowOpaqueFallback = \[bool\]\$payload\.allowOpaqueFallback/);
    assert.match(
      script,
      /\$null -eq \$window -and \$allowOpaqueFallback[\s\S]*Get-OpaqueGoGlobalLoginCandidateWindow/,
    );
    assert.match(
      script,
      /if \(-not \$allowOpaqueFallback\) \{ throw \}[\s\S]*Invoke-OpaqueGoGlobalLoginByCoordinates/,
    );
  });

  it('uses Win32 controls before the guarded coordinate fallback', () => {
    const driver = new PowerShellGoGlobalDesktopDriver();
    const script = (
      driver as unknown as {
        buildScript(operation: string): string;
      }
    ).buildScript('authenticate');

    const win32Index = script.indexOf('Invoke-Win32GoGlobalLogin $window');
    const opaqueIndex = script.indexOf(
      'Invoke-OpaqueGoGlobalLoginByCoordinates $window',
    );

    assert.ok(win32Index >= 0);
    assert.ok(opaqueIndex > win32Index);
    assert.match(script, /Wait-OpaqueGoGlobalLoginTransition \$loginHandle/);
    assert.match(
      script,
      /SendVirtualKey\(VK_CONTROL, true\)[\s\S]*index < 128[\s\S]*SendVirtualKey\(VK_BACK, false\)[\s\S]*SendTextAsPhysicalKeys\(targetWindow, value\)/,
    );
    assert.match(script, /VkKeyScanExW\(character, layout\)/);
    assert.match(script, /Thread\.Sleep\(15\)/);
    assert.match(
      script,
      /\$rect\.Height -ge 120[\s\S]*\$rect\.Height -lt 220[\s\S]*GO-Global rejected the submitted username or password/,
    );
  });

  it('falls back to WM_CLOSE for opaque GO-Global windows', () => {
    const driver = new PowerShellGoGlobalDesktopDriver();
    const script = (
      driver as unknown as {
        buildScript(operation: string): string;
      }
    ).buildScript('closeSession');

    assert.match(script, /private const uint WM_CLOSE = 0x0010/);
    assert.match(
      script,
      /if \(-not \$closedWindow\)[\s\S]*CloseWindow\(\$handle\)/,
    );
    assert.match(
      script,
      /\$ownedProcessId = \[int\]\$payload\.processId[\s\S]*Stop-Process -Id \$ownedProcessId -Force/,
    );
  });
});
