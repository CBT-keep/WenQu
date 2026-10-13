#Requires -RunAsAdministrator
<#
.SYNOPSIS
    WenQu - Windows development environment bootstrap.

.DESCRIPTION
    Run this ONCE as Administrator, then reboot. It performs the steps that
    require elevation:
      1. Enable WSL2 (Microsoft-Windows-Subsystem-Linux + VirtualMachinePlatform)
      2. Install Docker Desktop with the WSL2 backend

    After reboot, two manual steps remain (see output at the end):
      - Start Docker Desktop once and accept the terms
      - Paste the registry-mirrors JSON into Docker Desktop settings

.PARAMETER InstallerPath
    Path to Docker Desktop Installer.exe. Defaults to ~/Downloads/DockerDesktopInstaller.exe
#>

param(
    [string]$InstallerPath = (Join-Path $env:USERPROFILE 'Downloads\DockerDesktopInstaller.exe')
)

$ErrorActionPreference = 'Stop'

function Write-Step($m) { Write-Host "[STEP] $m" -ForegroundColor Cyan }
function Write-Ok($m)   { Write-Host "[ OK ] $m" -ForegroundColor Green }
function Write-Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Write-Next($m) { Write-Host "       $m" -ForegroundColor Gray }

Write-Host ""
Write-Host "=== WenQu dev environment setup (Windows) ===" -ForegroundColor White
Write-Host ""

# ---------------------------------------------------------------------------
# 1. Enable WSL2
# ---------------------------------------------------------------------------
Write-Step "Checking WSL / Virtual Machine Platform features..."

$needReboot = $false

$wslFeature = Get-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux
if ($wslFeature.State -eq 'Enabled') {
    Write-Ok "Microsoft-Windows-Subsystem-Linux already enabled"
} else {
    Write-Host "       enabling Microsoft-Windows-Subsystem-Linux..." -ForegroundColor Gray
    Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -NoRestart | Out-Null
    Write-Ok "Microsoft-Windows-Subsystem-Linux enabled"
    $needReboot = $true
}

$vmFeature = Get-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform
if ($vmFeature.State -eq 'Enabled') {
    Write-Ok "VirtualMachinePlatform already enabled"
} else {
    Write-Host "       enabling VirtualMachinePlatform..." -ForegroundColor Gray
    Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart | Out-Null
    Write-Ok "VirtualMachinePlatform enabled"
    $needReboot = $true
}

# Set WSL2 as the default version (requires the kernel update to be effective)
Write-Step "Setting WSL default version to 2..."
wsl.exe --set-default-version 2 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Ok "WSL default version = 2"
} else {
    Write-Warn "Could not set WSL default version. If WSL was just enabled, this is expected before reboot."
}

# ---------------------------------------------------------------------------
# 2. Install Docker Desktop
# ---------------------------------------------------------------------------
Write-Step "Installing Docker Desktop (WSL2 backend)..."

if (-not (Test-Path $InstallerPath)) {
    Write-Warn "Installer not found at: $InstallerPath"
    Write-Next "Download it from https://www.docker.com/products/docker-desktop/"
    Write-Next "then re-run this script, or double-click the installer."
} else {
    Write-Host "       running installer quietly, this takes a few minutes..." -ForegroundColor Gray
    $args = @('install', '--quiet', '--accept-license',
              '--backend=wsl-2', '--always-run-service')
    $p = Start-Process -FilePath $InstallerPath -ArgumentList $args -Wait -PassThru

    if ($p.ExitCode -eq 0) {
        Write-Ok "Docker Desktop installed"
        $needReboot = $true
    } else {
        Write-Warn "Installer exited with code $($p.ExitCode)"
        Write-Next "Re-run this script, or install manually by double-clicking the .exe"
    }
}

# ---------------------------------------------------------------------------
# 3. Next steps
# ---------------------------------------------------------------------------
Write-Host ""
Write-Host "=== Done. What's left for you ===" -ForegroundColor White
Write-Host ""

if ($needReboot) {
    Write-Host " 1. REBOOT the machine." -ForegroundColor Yellow
} else {
    Write-Host " 1. (No reboot strictly required, but recommended.)" -ForegroundColor Gray
}

Write-Host @"

 2. Start "Docker Desktop" from the Start menu and accept the terms.
    Wait until the tray icon shows "Docker Desktop running".

 3. Configure the China registry mirrors:
    Docker Desktop -> Settings (gear) -> Docker Engine -> paste this JSON,
    then "Apply & Restart":

    {
      "registry-mirrors": [
        "https://docker.1ms.run",
        "https://docker.xuanyuan.me",
        "https://docker.m.daocloud.io"
      ]
    }

 4. From the repo root, start the stack:

        cd E:\Develop
        docker compose up -d
        docker compose ps

 5. Verify pgvector:

        docker compose exec postgres psql -U wenqu -d wenqu -c "SELECT extversion FROM pg_extension WHERE extname='vector';"

 6. Start the backend (Flyway creates the tables):

        cd backend
        mvn spring-boot:run

"@

Write-Host "Tip: public mirror endpoints change often. To test one:" -ForegroundColor Gray
Write-Host "       curl -I https://docker.1ms.run/v2/   (200 or 401 = alive)" -ForegroundColor Gray
Write-Host ""
