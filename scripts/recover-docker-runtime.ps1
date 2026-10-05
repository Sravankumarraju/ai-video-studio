$ErrorActionPreference = 'Stop'
# Recover only disposable Docker IPC files. Never touch WSL disks, volumes or settings.
$runtimeSource = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'Docker\run'))
$runtimeExpected = 'C:\Users\sravankumar.raju\AppData\Local\Docker\run'
if ($runtimeSource -ne $runtimeExpected) { throw 'Unexpected runtime directory; refusing move.' }
$runtimeParent = Split-Path -Parent $runtimeSource
$runtimeBackup = [IO.Path]::GetFullPath((Join-Path $runtimeParent ('run-recovery-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))))
if ((Split-Path -Parent $runtimeBackup) -ne $runtimeParent) { throw 'Backup escaped Docker directory.' }
$runtimeEntries = Get-ChildItem -LiteralPath $runtimeSource -Force
if ($runtimeEntries | Where-Object { $_.PSIsContainer -or -not ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) }) { throw 'Unexpected non-socket content; refusing move.' }
$ipcSource = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'docker-secrets-engine'))
if ($ipcSource -ne 'C:\Users\sravankumar.raju\AppData\Local\docker-secrets-engine') { throw 'Unexpected IPC directory.' }
$ipcEntries = Get-ChildItem -LiteralPath $ipcSource -Force
if ($ipcEntries | Where-Object { $_.PSIsContainer -or -not ($_.Attributes -band [IO.FileAttributes]::ReparsePoint) }) { throw 'Unexpected non-socket content; refusing move.' }
$ipcBackup = [IO.Path]::GetFullPath($ipcSource + '-recovery-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
if ((Split-Path -Parent $ipcBackup) -ne (Split-Path -Parent $ipcSource)) { throw 'IPC backup escaped intended directory.' }
Get-Process -Name 'Docker Desktop','com.docker.backend' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
Move-Item -LiteralPath $runtimeSource -Destination $runtimeBackup
New-Item -ItemType Directory -Path $runtimeSource | Out-Null
Move-Item -LiteralPath $ipcSource -Destination $ipcBackup
New-Item -ItemType Directory -Path $ipcSource | Out-Null
@{runtimeBackup=$runtimeBackup;ipcBackup=$ipcBackup;volumesModified=$false;projectsModified=$false;time=(Get-Date -Format o)} | ConvertTo-Json | Set-Content -LiteralPath 'data/docker-runtime-recovery.json' -Encoding UTF8
Start-Process -FilePath 'C:\Program Files\Docker\Docker\frontend\Docker Desktop.exe' -WindowStyle Hidden
Write-Output 'Disposable IPC directory preserved and recreated; Docker Desktop started.'
