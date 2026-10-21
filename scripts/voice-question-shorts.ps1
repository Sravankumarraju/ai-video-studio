$ErrorActionPreference='Stop'
$env:STORY_STUDIO_MCP_TOKEN=[Environment]::GetEnvironmentVariable('STORY_STUDIO_MCP_TOKEN','User')
foreach ($shortNumber in 1..5) {
 $shortId='question-short-'+$shortNumber.ToString('000')
 $shortDirectory='data/productions/divine-wisdom/question-shorts-week-01/'+$shortId
 foreach ($stage in 'prepare','voice','finish') {
  node scripts/divine-long-episode.mjs $shortDirectory $stage
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
 }
}
Write-Output 'All five approved Shorts narration calls and voice finishing complete.'
