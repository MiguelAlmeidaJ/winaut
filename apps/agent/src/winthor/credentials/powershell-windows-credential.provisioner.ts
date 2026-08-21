import { spawn } from 'node:child_process';

const WINDOWS_CREDENTIAL_PREFIX = 'windows-credential:';

export function winThorApplicationCredentialReference(
  goGlobalReference: string,
): string {
  const goGlobalTarget = windowsCredentialTarget(goGlobalReference);
  const winThorTarget = /\/GO_GLOBAL$/i.test(goGlobalTarget)
    ? goGlobalTarget.replace(/\/GO_GLOBAL$/i, '/WINTHOR')
    : `${goGlobalTarget}/WINTHOR`;

  return `${WINDOWS_CREDENTIAL_PREFIX}${winThorTarget}`;
}

export function windowsCredentialTarget(reference: string): string {
  if (!reference.startsWith(WINDOWS_CREDENTIAL_PREFIX)) {
    throw new Error(
      `Unsupported credential reference "${reference}". Expected "windows-credential:<target>".`,
    );
  }

  const target = reference.slice(WINDOWS_CREDENTIAL_PREFIX.length).trim();

  if (!target) {
    throw new Error(
      `Unsupported credential reference "${reference}". Expected "windows-credential:<target>".`,
    );
  }

  return target;
}

export class PowerShellWindowsCredentialProvisioner {
  async provision(
    reference: string,
    suggestedUsername: string | null,
  ): Promise<void> {
    if (process.platform !== 'win32') {
      throw new Error(
        `Windows Credential Manager can only be configured on Windows (current platform: ${process.platform}).`,
      );
    }

    const target = windowsCredentialTarget(reference);

    const script = String.raw`
$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public static class OrquestraCredentialWriterNative {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct CREDENTIAL {
    public UInt32 Flags;
    public UInt32 Type;

    [MarshalAs(UnmanagedType.LPWStr)]
    public string TargetName;

    [MarshalAs(UnmanagedType.LPWStr)]
    public string Comment;

    public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
    public UInt32 CredentialBlobSize;
    public IntPtr CredentialBlob;
    public UInt32 Persist;
    public UInt32 AttributeCount;
    public IntPtr Attributes;

    [MarshalAs(UnmanagedType.LPWStr)]
    public string TargetAlias;

    [MarshalAs(UnmanagedType.LPWStr)]
    public string UserName;
  }

  [DllImport("Advapi32.dll", EntryPoint = "CredWriteW", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool CredWrite(ref CREDENTIAL userCredential, UInt32 flags);
}
'@

$target = [Environment]::GetEnvironmentVariable('ORQUESTRA_CREDENTIAL_TARGET')
$suggestedUsername = [Environment]::GetEnvironmentVariable('ORQUESTRA_CREDENTIAL_USERNAME')

if ([string]::IsNullOrWhiteSpace($target)) {
  throw 'Target da credencial não informado.'
}

if ([string]::IsNullOrWhiteSpace($suggestedUsername)) {
  $credential = Get-Credential -Message 'Informe o usuario e a senha do GO-Global/App Controller.'
} else {
  $credential = Get-Credential -UserName $suggestedUsername -Message 'Informe a senha do GO-Global/App Controller.'
}

if ($null -eq $credential) {
  exit 2
}

$bstr = [IntPtr]::Zero
$blob = [IntPtr]::Zero
$bytes = $null

try {
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
    $credential.Password
  )
  $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  $bytes = [Text.Encoding]::Unicode.GetBytes($password)

  if ($bytes.Length -gt 2560) {
    throw 'A senha excede o tamanho suportado pelo Windows Credential Manager.'
  }

  if ($bytes.Length -gt 0) {
    $blob = [Runtime.InteropServices.Marshal]::AllocHGlobal($bytes.Length)
    [Runtime.InteropServices.Marshal]::Copy(
      $bytes,
      0,
      $blob,
      $bytes.Length
    )
  }

  $nativeCredential = New-Object 'OrquestraCredentialWriterNative+CREDENTIAL'
  $nativeCredential.Flags = 0
  $nativeCredential.Type = 1
  $nativeCredential.TargetName = $target
  $nativeCredential.Comment = 'Orquestra WinThor GO_GLOBAL'
  $nativeCredential.CredentialBlobSize = [uint32]$bytes.Length
  $nativeCredential.CredentialBlob = $blob
  $nativeCredential.Persist = 2
  $nativeCredential.AttributeCount = 0
  $nativeCredential.Attributes = [IntPtr]::Zero
  $nativeCredential.TargetAlias = $null
  $nativeCredential.UserName = $credential.UserName

  $ok = [OrquestraCredentialWriterNative]::CredWrite(
    [ref]$nativeCredential,
    0
  )

  if (-not $ok) {
    $errorCode = [Runtime.InteropServices.Marshal]::GetLastWin32Error()
    throw [System.ComponentModel.Win32Exception]::new($errorCode)
  }

  Write-Host ''
  Write-Host 'Credencial GO_GLOBAL salva com sucesso no Windows Credential Manager.'
  Write-Host ('Target: ' + $target)
} finally {
  if ($null -ne $bytes) {
    [Array]::Clear($bytes, 0, $bytes.Length)
  }

  if ($blob -ne [IntPtr]::Zero) {
    $zeroes = New-Object byte[] $bytes.Length
    [Runtime.InteropServices.Marshal]::Copy(
      $zeroes,
      0,
      $blob,
      $zeroes.Length
    )
    [Runtime.InteropServices.Marshal]::FreeHGlobal($blob)
  }

  if ($bstr -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}
`;

    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        'powershell.exe',
        [
          '-NoLogo',
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          script,
        ],
        {
          windowsHide: false,
          stdio: 'inherit',
          env: {
            ...process.env,
            ORQUESTRA_CREDENTIAL_TARGET: target,
            ORQUESTRA_CREDENTIAL_USERNAME:
              suggestedUsername?.trim() || '',
          },
        },
      );

      child.once('error', reject);
      child.once('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        if (code === 2) {
          reject(new Error('Configuração da credencial cancelada pelo usuário.'));
          return;
        }

        reject(
          new Error(
            `Falha ao salvar a credencial no Windows Credential Manager. PowerShell exit code: ${code}.`,
          ),
        );
      });
    });
  }
}
