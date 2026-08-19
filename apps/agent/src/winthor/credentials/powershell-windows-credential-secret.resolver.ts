import { spawn } from 'node:child_process';

import type {
  CredentialSecretResolver,
  ResolvedCredentialSecret,
} from './credential-secret-resolver.interface.js';

const WINDOWS_CREDENTIAL_PREFIX = 'windows-credential:';

export class UnsupportedCredentialReferenceError extends Error {
  readonly code = 'CREDENTIAL_REFERENCE_UNSUPPORTED';

  constructor(readonly reference: string) {
    super(
      `Unsupported credential reference "${reference}". Expected "windows-credential:<target>".`,
    );
    this.name = UnsupportedCredentialReferenceError.name;
  }
}

export class WindowsCredentialNotFoundError extends Error {
  readonly code = 'WINDOWS_CREDENTIAL_NOT_FOUND';

  constructor(readonly target: string) {
    super(`Windows Credential Manager entry "${target}" was not found.`);
    this.name = WindowsCredentialNotFoundError.name;
  }
}

export class WindowsCredentialResolverPlatformError extends Error {
  readonly code = 'WINDOWS_CREDENTIAL_PLATFORM_UNSUPPORTED';

  constructor(readonly platform: NodeJS.Platform) {
    super(
      `Windows Credential Manager can only be read on Windows (current platform: ${platform}).`,
    );
    this.name = WindowsCredentialResolverPlatformError.name;
  }
}

export class PowerShellWindowsCredentialSecretResolver
  implements CredentialSecretResolver
{
  async resolve(reference: string): Promise<ResolvedCredentialSecret> {
    if (!reference.startsWith(WINDOWS_CREDENTIAL_PREFIX)) {
      throw new UnsupportedCredentialReferenceError(reference);
    }

    if (process.platform !== 'win32') {
      throw new WindowsCredentialResolverPlatformError(process.platform);
    }

    const target = reference.slice(WINDOWS_CREDENTIAL_PREFIX.length).trim();

    if (!target) {
      throw new UnsupportedCredentialReferenceError(reference);
    }

    const result = await this.readGenericCredential(target);

    if (!result) {
      throw new WindowsCredentialNotFoundError(target);
    }

    return result;
  }

  private readGenericCredential(
    target: string,
  ): Promise<ResolvedCredentialSecret | null> {
    const script = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class OrquestraCredentialNative {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public UInt32 Flags;
    public UInt32 Type;
    public IntPtr TargetName;
    public IntPtr Comment;
    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public UInt32 CredentialBlobSize;
    public IntPtr CredentialBlob;
    public UInt32 Persist;
    public UInt32 AttributeCount;
    public IntPtr Attributes;
    public IntPtr TargetAlias;
    public IntPtr UserName;
  }

  [DllImport("Advapi32.dll", EntryPoint = "CredReadW", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool CredRead(string target, uint type, uint flags, out IntPtr credentialPtr);

  [DllImport("Advapi32.dll", SetLastError = true)]
  public static extern void CredFree(IntPtr buffer);
}
'@

$payload = [Console]::In.ReadToEnd() | ConvertFrom-Json
$pointer = [IntPtr]::Zero

try {
  $ok = [OrquestraCredentialNative]::CredRead([string]$payload.target, 1, 0, [ref]$pointer)
  if (-not $ok) {
    if ([Runtime.InteropServices.Marshal]::GetLastWin32Error() -eq 1168) {
      Write-Output 'null'
      exit 0
    }
    throw [System.ComponentModel.Win32Exception]::new([Runtime.InteropServices.Marshal]::GetLastWin32Error())
  }

  $credential = [Runtime.InteropServices.Marshal]::PtrToStructure(
    $pointer,
    [type][OrquestraCredentialNative+CREDENTIAL]
  )

  $username = if ($credential.UserName -eq [IntPtr]::Zero) {
    $null
  } else {
    [Runtime.InteropServices.Marshal]::PtrToStringUni($credential.UserName)
  }

  $secret = if ($credential.CredentialBlob -eq [IntPtr]::Zero -or $credential.CredentialBlobSize -eq 0) {
    ''
  } else {
    [Runtime.InteropServices.Marshal]::PtrToStringUni(
      $credential.CredentialBlob,
      [int]($credential.CredentialBlobSize / 2)
    )
  }

  [PSCustomObject]@{
    username = $username
    secret = $secret
  } | ConvertTo-Json -Compress
} finally {
  if ($pointer -ne [IntPtr]::Zero) {
    [OrquestraCredentialNative]::CredFree($pointer)
  }
}
`;

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

      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk: string) => {
        stderr += chunk;
      });
      child.once('error', reject);
      child.once('close', (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `Failed to read Windows Credential Manager entry: ${stderr.trim() || `PowerShell exited with code ${code}.`}`,
            ),
          );
          return;
        }

        const text = stdout.trim();

        if (!text || text === 'null') {
          resolve(null);
          return;
        }

        const parsed = JSON.parse(text) as {
          username?: unknown;
          secret?: unknown;
        };

        if (typeof parsed.secret !== 'string') {
          reject(
            new Error(
              'Windows Credential Manager returned an invalid credential payload.',
            ),
          );
          return;
        }

        resolve({
          username:
            typeof parsed.username === 'string' && parsed.username.trim()
              ? parsed.username
              : null,
          secret: parsed.secret,
        });
      });

      child.stdin.end(JSON.stringify({ target }));
    });
  }
}
