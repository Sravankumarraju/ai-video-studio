$ErrorActionPreference='Stop'
$studioWorkspace='D:\Projects\Claude Projects\ai-video-studio'
Set-Location -LiteralPath $studioWorkspace
$logPath=Join-Path $studioWorkspace 'data/docker-cache-compaction.log'
Start-Transcript -Path $logPath -Force
$stopped=$false
try {
 if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) { throw 'Administrator access required for VHD compaction.' }
 $diskPath=[IO.Path]::GetFullPath('C:\Users\sravankumar.raju\AppData\Local\Docker\wsl\disk\docker_data.vhdx')
 if($diskPath -ne 'C:\Users\sravankumar.raju\AppData\Local\Docker\wsl\disk\docker_data.vhdx' -or -not (Test-Path -LiteralPath $diskPath)){throw 'Unexpected Docker disk.'}
 $others=@(docker ps --format '{{.Names}}' | Where-Object {$_ -notmatch '^ai-video-studio-(app|worker|youtube-worker|db|redis)-1$'})
 if($LASTEXITCODE -ne 0 -or $others.Count){throw 'Refusing to interrupt other Docker workloads.'}
 Write-Output ('C free before: '+[IO.DriveInfo]::new('C').AvailableFreeSpace)
 docker compose stop
 if($LASTEXITCODE -ne 0){throw 'Could not stop Story Studio safely.'}
 $stopped=$true
 Get-Process -Name 'Docker Desktop','com.docker.backend' -ErrorAction SilentlyContinue | Stop-Process -Force
 wsl --terminate docker-desktop
 Start-Sleep -Seconds 3
 $diskScript=Join-Path $studioWorkspace 'data/compact-approved-docker-disk.txt'
 @('select vdisk file="'+$diskPath+'"','compact vdisk','exit') | Set-Content -LiteralPath $diskScript -Encoding ASCII
 diskpart /s $diskScript
 Write-Output ('C free after: '+[IO.DriveInfo]::new('C').AvailableFreeSpace)
} catch {Write-Output ('Compaction error: '+$_.Exception.Message)} finally {
 if($stopped){
  & (Join-Path $studioWorkspace 'scripts/recover-docker-runtime.ps1')
  for($i=0;$i -lt 60;$i++){
   docker info --format '{{.ServerVersion}}' 2>$null | Out-Null
   if($LASTEXITCODE -eq 0){break}
   Start-Sleep -Seconds 2
  }
  docker compose start
 }
 Stop-Transcript
}
