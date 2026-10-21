$ErrorActionPreference='Stop'
$env:STORY_STUDIO_MCP_TOKEN=[Environment]::GetEnvironmentVariable('STORY_STUDIO_MCP_TOKEN','User')
foreach ($shortNumber in 1..40) {
 $shortId='motivation-short-'+$shortNumber.ToString('000')
 $shortDirectory='data/productions/divine-wisdom/motivation-shorts-40/'+$shortId
 foreach ($stage in 'prepare','voice','finish') {
  node scripts/divine-long-episode.mjs $shortDirectory $stage
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
 }
}
Write-Output 'All forty preapproved narration calls and finishing complete.'
