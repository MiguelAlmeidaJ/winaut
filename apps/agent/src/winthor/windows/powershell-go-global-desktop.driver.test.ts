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
});
