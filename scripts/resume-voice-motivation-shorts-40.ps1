param([int]$StartNumber=33)
$ErrorActionPreference='Stop'
$workspace='D:/Projects/Claude Projects/ai-video-studio'
Set-Location -LiteralPath $workspace
$other=Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -and (($_.Name -in @('powershell.exe','pwsh.exe') -and $_.CommandLine -match '(?:-File\s+"?[\w:/ .-]*)(?:voice-motivation-shorts-40|resume-voice-motivation-shorts-40)\.ps1') -or ($_.Name -eq 'node.exe' -and $_.CommandLine -match 'divine-long-episode\.mjs.*motivation-short.*\s(?:prepare|voice|finish)(?:\s|$)')) }
if($other){throw 'Another matching narration process is running; preserve saved jobs.'}
$root='data/productions/divine-wisdom/motivation-shorts-40'
$plan=Get-Content -LiteralPath "$root/NARRATION-PLAN.json" -Raw | ConvertFrom-Json
if($plan.plannedCalls -ne 40 -or $plan.characters -ne 17313 -or !$plan.paidNarrationAuthorized){throw 'Frozen authorized narration plan changed'}
$env:STORY_STUDIO_MCP_TOKEN=[Environment]::GetEnvironmentVariable('STORY_STUDIO_MCP_TOKEN','User')
if($StartNumber -lt 33 -or $StartNumber -gt 40){throw 'Only the unfinished tail of the approved batch may resume'}
foreach($shortNumber in $StartNumber..40){
 $dir="$root/motivation-short-"+$shortNumber.ToString('000')
 $state=$null
 if(Test-Path -LiteralPath "$dir/state.json"){$state=Get-Content -LiteralPath "$dir/state.json" -Raw | ConvertFrom-Json}
 if($state -and $state.finished -and @($state.finished.PSObject.Properties).Count -eq 1){continue}
 foreach($stage in 'prepare','voice','finish'){
  node scripts/divine-long-episode.mjs $dir $stage
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
 }
}
Write-Output 'Saved forty-call narration plan complete; no completed recordings repeated.'
