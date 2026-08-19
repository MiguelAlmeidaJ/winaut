param(
  [string]$OutputDirectory = ""
)

$ErrorActionPreference = 'Stop'

if (-not $IsWindows -and $env:OS -ne 'Windows_NT') {
  throw 'Orquestra Agent Windows packaging must run on Windows.'
}

$InstallerDir = $PSScriptRoot
$AgentDir = Split-Path -Parent $InstallerDir
$RepoRoot = (Resolve-Path (Join-Path $AgentDir '..\..')).Path
$PackageJsonPath = Join-Path $AgentDir 'package.json'
$Package = Get-Content $PackageJsonPath -Raw | ConvertFrom-Json
$Version = [string]$Package.version

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
  $OutputDirectory = Join-Path $InstallerDir 'out'
}

$OutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)
$PayloadRoot = Join-Path $InstallerDir '.payload'
$AppPayload = Join-Path $PayloadRoot 'app'
$RuntimePayload = Join-Path $PayloadRoot 'runtime'
$DeployWorkspace = Join-Path $PayloadRoot 'workspace'
$DeployAgentDir = Join-Path $DeployWorkspace 'apps\agent'
$DeployContractsDir = Join-Path $DeployWorkspace 'packages\contracts'

Remove-Item $PayloadRoot -Recurse -Force -ErrorAction SilentlyContinue
New-Item $AppPayload -ItemType Directory -Force | Out-Null
New-Item $RuntimePayload -ItemType Directory -Force | Out-Null
New-Item $DeployAgentDir -ItemType Directory -Force | Out-Null
New-Item $DeployContractsDir -ItemType Directory -Force | Out-Null
New-Item $OutputDirectory -ItemType Directory -Force | Out-Null

Push-Location $RepoRoot
try {
  Write-Host '[Package] Building shared contracts...'
  & pnpm --filter '@winaut/contracts' build
  if ($LASTEXITCODE -ne 0) {
    throw "Contracts build failed with exit code $LASTEXITCODE."
  }

  Write-Host '[Package] Building Agent...'
  & pnpm --filter '@winaut/agent' build
  if ($LASTEXITCODE -ne 0) {
    throw "Agent build failed with exit code $LASTEXITCODE."
  }

  Write-Host '[Package] Preparing isolated deployment workspace...'
  Copy-Item (Join-Path $RepoRoot 'package.json') $DeployWorkspace -Force
  Copy-Item (Join-Path $RepoRoot 'pnpm-lock.yaml') $DeployWorkspace -Force
  Copy-Item (Join-Path $RepoRoot 'pnpm-workspace.yaml') $DeployWorkspace -Force
  Copy-Item (Join-Path $AgentDir 'package.json') $DeployAgentDir -Force
  Copy-Item (Join-Path $AgentDir 'dist') $DeployAgentDir -Recurse -Force
  Copy-Item (Join-Path $RepoRoot 'packages\contracts\package.json') $DeployContractsDir -Force
  Copy-Item (Join-Path $RepoRoot 'packages\contracts\dist') $DeployContractsDir -Recurse -Force

  Write-Host '[Package] Creating portable production deployment in isolated workspace...'
  & pnpm --dir $DeployWorkspace --filter '@winaut/agent' --prod deploy --legacy $AppPayload
  if ($LASTEXITCODE -ne 0) {
    throw "pnpm deploy failed with exit code $LASTEXITCODE."
  }
} finally {
  Pop-Location
}

$NodeCommand = Get-Command node.exe -ErrorAction Stop
Copy-Item $NodeCommand.Source (Join-Path $RuntimePayload 'node.exe') -Force

$ProgramFiles = [Environment]::GetFolderPath('ProgramFiles')
$ProgramFilesX86 = [Environment]::GetFolderPath('ProgramFilesX86')
$IsccCandidates = @(
  (Get-Command ISCC.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
  (Join-Path $ProgramFiles 'Inno Setup 7\ISCC.exe'),
  (Join-Path $ProgramFilesX86 'Inno Setup 7\ISCC.exe'),
  (Join-Path $ProgramFiles 'Inno Setup 6\ISCC.exe'),
  (Join-Path $ProgramFilesX86 'Inno Setup 6\ISCC.exe'),
  (Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 7\ISCC.exe'),
  (Join-Path $env:LOCALAPPDATA 'Programs\Inno Setup 6\ISCC.exe')
) | Where-Object { $_ -and (Test-Path $_) }

$Iscc = $IsccCandidates | Select-Object -First 1
if (-not $Iscc) {
  $SearchRoots = @(
    $ProgramFiles,
    $ProgramFilesX86,
    (Join-Path $env:LOCALAPPDATA 'Programs')
  ) | Where-Object { $_ -and (Test-Path $_) }

  $Iscc = $SearchRoots |
    ForEach-Object {
      Get-ChildItem $_ -Filter ISCC.exe -File -Recurse -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty FullName
    } |
    Select-Object -First 1
}

if (-not $Iscc) {
  throw 'Inno Setup compiler (ISCC.exe) was not found. Install Inno Setup 7 (or 6) on the build machine and retry.'
}

$ScriptPath = Join-Path $InstallerDir 'OrquestraAgent.iss'
Write-Host "[Package] Compiling installer with Inno Setup: $Iscc"
& $Iscc "/DPayloadRoot=$PayloadRoot" "/DMyAppVersion=$Version" "/O$OutputDirectory" $ScriptPath
if ($LASTEXITCODE -ne 0) {
  throw "Inno Setup compilation failed with exit code $LASTEXITCODE."
}

$SetupPath = Join-Path $OutputDirectory "OrquestraAgentSetup-$Version.exe"
if (-not (Test-Path $SetupPath)) {
  throw "Installer compilation completed but the expected file was not found: $SetupPath"
}

Remove-Item $PayloadRoot -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "[Package] Installer ready: $SetupPath"
